import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Pengguna } from "@/lib/akses";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { GalatTanpaKunci } from "@/lib/data/kunci-api";
import { cariPotongan } from "@/lib/data/pencarian";
import type { KolomLkps, BarisLkps } from "@/lib/lkps/jenis";
import { formatMetrik } from "@/lib/tampil";
import { hitungAnggaran } from "@/lib/domain/anggaran";
import { bacaAnggaran, targetKataSubBagian } from "@/lib/domain/anggaran-proyek";
import { bacaVarian, berlakuUntukJenjang, varianUntukJenjang } from "@/lib/domain/instrumen";
import { hitungSemua, type HasilButirAngka } from "@/lib/domain/metrik-lkps";
import {
  bacaDokumen, keluaranKeDokumen, kumpulkanAngkaSah, perluRingkasanIku, perluRingkasanSemua, periksaDokumen, ringkasIku, samarkanTeks,
  statusGabungan, tabelKeMarkdown, tahunSah, teksDokumen, urutkanUntukGenerate, type RujukanPeriksa, type StatusIsi,
  type TabelSistem,
} from "@/lib/domain/narasi";
import { kodeSumberSah, periksaKeluaran, susunPengguna, susunSistem, type KonteksSubBagian } from "@/lib/domain/prompt";
import { formatTahunAkademik, gantiLabelTS, petaTS } from "@/lib/domain/tahun-akademik";
import { GalatSementara, panggilNarasi } from "@/lib/proses/llm-narasi";

/**
 * Mesin penyusun (F-13): menyusun konteks satu sub-bagian, memanggil LLM, mengubah keluaran ke dokumen Tiptap,
 * menjalankan pemeriksaan otomatis, lalu menyimpan versi baru (F-17). Tugas generate (TugasGenerate) memproses
 * daftar sub-bagian berurutan dan bisa berhenti rapi (kunci habis) lalu lanjut dari indeks terakhir.
 */

const TARGET_CADANGAN = 250;

/** Pengguna sistem untuk memakai fungsi data yang memeriksa peran (worker tidak punya sesi). */
function penggunaSistem(): Pengguna {
  return { id: "sistem", nama: "Sistem", email: "", peran: "PENANGGUNG_JAWAB" };
}

/** Sub-bagian yang berlaku untuk jenjang proyek di satu bagian, beserta butirnya. */
export async function subBagianProyek(proyek: { versiId: string; jenjang: string }, bagianKode: string) {
  const sub = await prisma.subBagian.findMany({
    where: { bagian: { versiId: proyek.versiId, kode: bagianKode } },
    orderBy: { urutan: "asc" },
    include: { butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: true } } },
  });
  return sub
    .filter((s) => berlakuUntukJenjang(s, proyek.jenjang))
    .map((s) => ({ ...s, butir: s.butir.map((x) => x.butir).sort((a, b) => a.urutan - b.urutan) }));
}

/** Kode sub-bagian yang di-generate untuk satu bagian, dalam urutan generate. */
export async function urutanSubBagian(proyek: { versiId: string; jenjang: string }, bagianKode: string): Promise<string[]> {
  return urutkanUntukGenerate(await subBagianProyek(proyek, bagianKode)).map((s) => s.kode);
}

/** Status bagian (kriteria) dari status sub-bagiannya. */
export async function perbaruiStatusBagian(proyekId: string, bagianKode: string): Promise<StatusIsi> {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const kode = await urutanSubBagian(proyek, bagianKode);
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId, subBagian: { kode: { in: kode }, bagian: { versiId: proyek.versiId, kode: bagianKode } } },
    select: { status: true },
  });
  const status = statusGabungan([...draf.map((d) => d.status), ...Array(Math.max(kode.length - draf.length, 0)).fill("belum")]);
  await prisma.statusKriteria.upsert({
    where: { proyekId_bagianKode: { proyekId, bagianKode } },
    create: { proyekId, bagianKode, status },
    update: { status },
  });
  return status;
}

interface KonteksLengkap {
  konteks: KonteksSubBagian;
  rujukan: RujukanPeriksa;
  tabelSistem: TabelSistem[];
  legenda: Record<string, string>;
  catatan: string[];
  sub: { id: string; kode: string; bagianKode: string };
}

/** Susun konteks prompt satu sub-bagian. Data pribadi disamarkan sebelum masuk konteks. */
export async function susunKonteks(proyekId: string, subBagianKode: string): Promise<KonteksLengkap> {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId }, include: { prodi: true } });
  const fakultas = await prisma.fakultas.findUnique({ where: { id: "utama" } });
  const ts = proyek.tsTahunMulai;
  const s = await prisma.subBagian.findFirst({
    where: { kode: subBagianKode, bagian: { versiId: proyek.versiId } },
    include: { bagian: true, butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: true } } },
  });
  if (!s) throw new Error(`Sub-bagian ${subBagianKode} tidak ada di versi instrumen proyek.`);
  const butir = s.butir.map((x) => x.butir).sort((a, b) => a.urutan - b.urutan);
  const instruksi = gantiLabelTS(varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang)?.instruksi ?? "", ts);
  const legenda: Record<string, string> = {};
  const catatan: string[] = [];

  // jawaban penyusun
  const jawaban = await prisma.jawabanForm.findUnique({ where: { proyekId_subBagianKode: { proyekId, subBagianKode } } });
  const jawabanForm = jawaban?.isi.trim() ? samarkanTeks(jawaban.isi.trim()) : null;
  if (jawabanForm) legenda.J = "Jawaban penyusun di formulir";

  // LKPS aktif: metrik butir angka dan tabel terkait
  const berkas = await prisma.berkasLKPS.findFirst({ where: { proyekId, aktif: true }, include: { tabel: { orderBy: { urutan: "asc" } } } });
  const tabelLkps = (berkas?.tabel ?? []).map((t) => ({ ...t, kolom: t.kolom as unknown as KolomLkps[], baris: t.baris as unknown as BarisLkps[] }));
  const hasilMetrik: HasilButirAngka[] = berkas ? hitungSemua(tabelLkps, { tsTahunMulai: ts }) : [];
  const metrikButir = butir.filter((b) => b.jenis === "angka").flatMap((b) => {
    const h = hasilMetrik.find((x) => x.butir === b.kode);
    return h ? [h] : [];
  });
  const metrik = metrikButir.flatMap((h) => h.metrik.filter((m) => m.nilai !== null).map((m) => {
    legenda[m.kode] = `Metrik sistem: ${m.nama}`;
    return { id: m.kode, nama: m.nama, nilaiTeks: formatMetrik(m), keterangan: m.rumus };
  }));
  const kodeTabel = new Set(butir.flatMap((b) => b.tabelLkps));
  const tabel = tabelLkps.filter((t) => kodeTabel.has(t.kode)).map((t) => {
    const judul = `Tabel ${t.kode}${t.blok ? ` (${t.blok})` : ""} ${t.judul}`.trim();
    legenda[`T-${t.sheet}`] = `LKPS ${judul}`;
    return { id: `T-${t.sheet}`, judul, markdown: tabelKeMarkdown(t, ts) };
  });
  if (kodeTabel.size > 0 && !berkas) catatan.push("LKPS belum diunggah: tabel dan metrik tidak tersedia.");

  // potongan dokumen (RAG)
  const kueri = [s.judul, instruksi.slice(0, 400), ...butir.flatMap((b) => [b.indikator, ...b.unsurSkor4])].join(". ").slice(0, 1500);
  const cari = await cariPotongan(penggunaSistem(), proyekId, kueri, { subBagianKode, k: 8 });
  catatan.push(...cari.catatan);
  // dokumen proyek D1, D2, ...; bahan bersama UPPS (U-10) U1, U2, ... supaya penyusun tahu bukti berasal dari fakultas
  let nD = 0;
  let nU = 0;
  const potongan = cari.hasil.map((h) => {
    const id = h.bersama ? `U${++nU}` : `D${++nD}`;
    const sumber = `${h.judul ?? h.namaBerkas}${h.halaman ? `, hlm. ${h.halaman}` : ""}`;
    legenda[id] = `${h.bersama ? "Bahan bersama UPPS" : "Dokumen"}: ${sumber}`;
    return { id, sumber, teks: samarkanTeks(h.teks) };
  });

  // ringkasan IKU untuk analisis faktor dan SWOT
  let ringkasanIku: string | null = null;
  if (perluRingkasanIku(s.kode)) {
    const iku = await prisma.bagianDraf.findMany({
      where: { proyekId, versiAktifId: { not: null }, subBagian: { bagianId: s.bagianId, tipe: "iku" } },
      include: { subBagian: true },
      orderBy: { subBagian: { urutan: "asc" } },
    });
    const versi = await prisma.versiDraf.findMany({ where: { id: { in: iku.map((d) => d.versiAktifId!) } } });
    ringkasanIku = ringkasIku(iku.flatMap((d) => {
      const v = versi.find((x) => x.id === d.versiAktifId);
      return v ? [{
        judul: `${d.subBagian.label} ${d.subBagian.judul}`.trim(),
        teks: teksDokumen(bacaDokumen(v.isi), { tanpaTabel: true }),
        unsur: (v.unsur ?? []) as { status: string }[],
      }] : [];
    })) || null;
    if (!ringkasanIku) catatan.push("Belum ada draf indikator kinerja (IKU) untuk diringkas.");
  }

  // kata pengantar, ringkasan eksekutif, Bab III dan IV: ringkasan analisis faktor dan SWOT semua kriteria
  if (perluRingkasanSemua(s.kode)) {
    const draf = await prisma.bagianDraf.findMany({
      where: { proyekId, versiAktifId: { not: null }, subBagian: { tipe: "bersama", bagian: { versiId: proyek.versiId, jenis: "kriteria" } } },
      include: { subBagian: { include: { bagian: true } } },
    });
    const pilih = draf
      .filter((d) => /-(AF|SWOT)$/.test(d.subBagian.kode))
      .sort((a, b) => a.subBagian.bagian.urutan - b.subBagian.bagian.urutan || a.subBagian.urutan - b.subBagian.urutan);
    const versi = await prisma.versiDraf.findMany({ where: { id: { in: pilih.map((d) => d.versiAktifId!) } } });
    ringkasanIku = ringkasIku(pilih.flatMap((d) => {
      const v = versi.find((x) => x.id === d.versiAktifId);
      return v ? [{ judul: `${d.subBagian.bagian.kode} ${d.subBagian.judul}`, teks: teksDokumen(bacaDokumen(v.isi), { tanpaTabel: true }) }] : [];
    }), 6000) || null;
    if (!ringkasanIku) catatan.push("Belum ada draf analisis faktor atau SWOT kriteria untuk diringkas; susun kriteria C.1–C.7 lebih dulu.");
  }

  // target kata (anggaran halaman)
  const { pengaturan, bagian: bagianAnggaran } = bacaAnggaran(proyek.anggaran);
  const semuaButir = await prisma.butirPenilaian.findMany({
    where: { versiId: proyek.versiId, jenjang: proyek.jenjang },
    select: { kode: true, bagianKode: true, bobot: true, jenis: true },
  });
  const anggaran = hitungAnggaran(bagianAnggaran, semuaButir.map((b) => ({ kode: b.kode, bagian: b.bagianKode, bobot: Number(b.bobot), jenis: b.jenis })), pengaturan);
  const subSebagian = await subBagianProyek(proyek, s.bagian.kode);
  const target = targetKataSubBagian(anggaran, s.bagian.kode, subSebagian.map((x) => ({ kode: x.kode, tipe: x.tipe, butir: x.butir.map((b) => b.kode) })))[s.kode] ?? TARGET_CADANGAN;

  const konteks: KonteksSubBagian = {
    prodi: { nama: proyek.prodi.nama, jenjang: proyek.jenjang, upps: fakultas?.nama ?? "", perguruanTinggi: fakultas?.perguruanTinggi ?? "" },
    ts: { tahunAkademik: formatTahunAkademik(ts), petaLabel: petaTS(ts, 4) },
    subBagian: { kode: s.kode, label: s.label, judul: s.judul, grup: s.grup, instruksi, tipe: s.tipe },
    kriteria: s.bagian.jenis === "kriteria" ? { kode: s.bagian.kode, nama: s.bagian.nama } : null,
    butir: butir.map((b) => ({
      kode: b.kode, elemen: b.elemen, indikator: gantiLabelTS(b.indikator, ts), jenis: b.jenis,
      deskriptorSkor4: gantiLabelTS(b.deskriptorSkor4, ts), unsurSkor4: b.unsurSkor4.map((u) => gantiLabelTS(u, ts)),
    })),
    jawabanForm,
    metrik,
    tabel,
    potongan,
    ringkasanIku,
    targetKata: target,
  };

  const tabelSistem: TabelSistem[] = metrikButir.map((h) => ({
    judul: `Butir ${h.butir}. ${h.judul}`,
    kepala: ["Metrik", "Nilai"],
    baris: h.metrik.map((m) => [m.nama, formatMetrik(m)]),
    sumber: h.metrik.map((m) => m.kode),
  }));
  const nilaiMetrik = metrikButir.flatMap((h) => h.metrik.map((m) => m.nilai).filter((v): v is number => v !== null));
  const rujukan: RujukanPeriksa = {
    angkaSah: kumpulkanAngkaSah(konteks, nilaiMetrik),
    tahunSah: tahunSah(ts),
    target,
    sumberSah: [...kodeSumberSah(konteks)],
  };
  return { konteks, rujukan, tabelSistem, legenda, catatan, sub: { id: s.id, kode: s.kode, bagianKode: s.bagian.kode } };
}

/** Generate satu sub-bagian dan simpan sebagai versi baru. */
export async function generateSubBagian(
  proyekId: string,
  subBagianKode: string,
  opsi: { tugasId?: string | null; dibuatOlehId?: string | null } = {},
) {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const k = await susunKonteks(proyekId, subBagianKode);
  const hasil = await panggilNarasi({
    prodiId: proyek.prodiId,
    proyekId,
    tugasId: opsi.tugasId,
    subBagianKode,
    sistem: susunSistem(),
    pengguna: susunPengguna(k.konteks),
  });
  const doc = keluaranKeDokumen(hasil.keluaran, k.tabelSistem);
  const pemeriksaan = periksaDokumen(doc, k.rujukan, periksaKeluaran(k.konteks, hasil.keluaran));
  const dibuatOlehId = opsi.dibuatOlehId && (await prisma.user.findUnique({ where: { id: opsi.dibuatOlehId }, select: { id: true } })) ? opsi.dibuatOlehId : null;

  const versi = await prisma.$transaction(async (tx) => {
    const bd = await tx.bagianDraf.upsert({
      where: { proyekId_subBagianId: { proyekId, subBagianId: k.sub.id } },
      create: { proyekId, subBagianId: k.sub.id },
      update: {},
    });
    const akhir = await tx.versiDraf.findFirst({ where: { bagianDrafId: bd.id }, orderBy: { nomor: "desc" }, select: { nomor: true } });
    const v = await tx.versiDraf.create({
      data: {
        bagianDrafId: bd.id,
        nomor: (akhir?.nomor ?? 0) + 1,
        asal: "generate",
        isi: doc as unknown as Prisma.InputJsonValue,
        sumber: k.legenda,
        unsur: hasil.keluaran.unsur as unknown as Prisma.InputJsonValue,
        dokumenKurang: hasil.keluaran.dokumenKurang,
        pemeriksaan: { ...pemeriksaan, rujukan: k.rujukan, catatanSistem: k.catatan } as unknown as Prisma.InputJsonValue,
        model: hasil.model,
        keluaranMentah: {
          keluaran: hasil.keluaran,
          pemakaian: { tokenMasuk: hasil.tokenMasuk, tokenKeluar: hasil.tokenKeluar, durasiMs: hasil.durasiMs },
        } as unknown as Prisma.InputJsonValue,
        jumlahKata: pemeriksaan.jumlahKata,
        dibuatOlehId,
        tugasId: opsi.tugasId ?? null,
      },
    });
    await tx.bagianDraf.update({ where: { id: bd.id }, data: { status: "draf", versiAktifId: v.id } });
    return v;
  });
  await perbaruiStatusBagian(proyekId, k.sub.bagianKode);
  return versi;
}

// ------------------------------------------------------------------ tugas generate

async function ubahTugas(id: string, dariStatus: string[], data: Prisma.TugasGenerateUpdateManyMutationInput) {
  return prisma.tugasGenerate.updateMany({ where: { id, status: { in: dariStatus } }, data });
}

/** Jadwalkan lanjutan otomatis saat kuota kunci (fakultas atau cadangan) paling cepat direset. */
async function jadwalkanSetelahReset(tugasId: string): Promise<Date | null> {
  const k = await prisma.kunciAPI.findFirst({
    where: { status: "kuota_habis", habisSampai: { not: null } },
    orderBy: { habisSampai: "asc" },
  });
  if (!k?.habisSampai) return null;
  const waktu = new Date(k.habisSampai.getTime() + 60_000);
  await kirimTugas(ANTREAN.generate, { tugasId }, { mulaiSetelah: waktu });
  await prisma.tugasGenerate.update({ where: { id: tugasId }, data: { dilanjutkanPada: waktu } });
  return waktu;
}

/**
 * Kerjakan tugas generate dari indeks terakhir. Hanya tugas berstatus antre/tertunda yang diambil (mencegah
 * dua worker mengerjakan tugas yang sama). Berhenti rapi bila kunci habis (tertunda) dan lanjut dari sub-bagian itu.
 */
export async function prosesTugasGenerate(tugasId: string): Promise<string> {
  const klaim = await ubahTugas(tugasId, ["antre", "tertunda"], { status: "berjalan", pesan: null, dilanjutkanPada: null });
  if (klaim.count === 0) return "dilewati";
  const tugas = await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: tugasId }, include: { proyek: true } });
  for (let i = tugas.indeks; i < tugas.subBagianKode.length; i++) {
    const kini = await prisma.tugasGenerate.findUnique({ where: { id: tugasId }, select: { status: true } });
    if (!kini || kini.status !== "berjalan") return kini?.status ?? "dibatalkan";
    const kode = tugas.subBagianKode[i];
    try {
      await generateSubBagian(tugas.proyekId, kode, { tugasId, dibuatOlehId: tugas.dibuatOlehId });
    } catch (e) {
      if (e instanceof GalatTanpaKunci) {
        await ubahTugas(tugasId, ["berjalan"], { status: "tertunda", pesan: e.message });
        await jadwalkanSetelahReset(tugasId);
        return "tertunda";
      }
      if (e instanceof GalatSementara) {
        const waktu = new Date(Date.now() + Math.max(e.tungguMs, 30_000));
        await ubahTugas(tugasId, ["berjalan"], { status: "tertunda", pesan: e.message, dilanjutkanPada: waktu });
        await kirimTugas(ANTREAN.generate, { tugasId }, { mulaiSetelah: waktu });
        return "tertunda";
      }
      const pesan = e instanceof Error ? e.message : String(e);
      console.error(`[generate] ${tugasId} ${kode}:`, pesan);
      await ubahTugas(tugasId, ["berjalan"], { status: "gagal", pesan: `Gagal menyusun ${kode}: ${pesan.slice(0, 300)}` });
      return "gagal";
    }
    await prisma.tugasGenerate.update({ where: { id: tugasId }, data: { indeks: i + 1 } });
  }
  await ubahTugas(tugasId, ["berjalan"], { status: "selesai", pesan: null });
  return "selesai";
}

/** Saat worker mulai: tugas yang terputus (berjalan) dan tugas antre dikirim ulang ke antrean. */
export async function pulihkanTugasTerputus(): Promise<number> {
  await prisma.tugasGenerate.updateMany({ where: { status: "berjalan" }, data: { status: "antre" } });
  const daftar = await prisma.tugasGenerate.findMany({ where: { status: "antre" }, select: { id: true } });
  for (const t of daftar) await kirimTugas(ANTREAN.generate, { tugasId: t.id });
  return daftar.length;
}
