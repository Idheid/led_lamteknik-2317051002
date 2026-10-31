import { prisma } from "@/modules/bersama/db";
import { Prisma } from "@/generated/prisma/client";
import type { Pengguna } from "@/modules/bersama/akses";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { GalatTanpaKunci } from "@/modules/bersama/data/kunci-api";
import { cariPotongan } from "@/modules/led/data/pencarian";
import { kueriGenerate } from "@/modules/led/domain/rrf";
import type { KolomLkps, BarisLkps } from "@/modules/led/data-lkps/jenis";
import { formatMetrik } from "@/modules/led/tampil";
import { hitungAnggaran } from "@/modules/led/domain/anggaran";
import { bacaAnggaran, targetKataSubBagian } from "@/modules/led/domain/anggaran-proyek";
import { bacaVarian, berlakuUntukJenjang, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import type { HasilButirAngka } from "@/modules/led/domain/metrik-lkps";
import { kodeSumberManual } from "@/modules/led/domain/butir-angka";
import { jadwalMundur } from "@/modules/led/domain/kesiapan";
import { bacaTim } from "@/modules/led/proses/ekspor";
import { nilaiButirUntukProyek } from "@/modules/led/data/nilai-butir";
import { capaianButirUntukProyek } from "@/modules/led/data/target-butir";
import { teksCapaian, teksTren } from "@/modules/led/domain/capaian";
import { MAKS_TEKS_SUMBER } from "@/modules/led/domain/verifikasi";
import {
  bacaDokumen, keluaranKeDokumen, kumpulkanAngkaSah, perluRingkasanIku, perluRingkasanSemua, periksaDokumen, ringkasIku, samarkanTeks,
  statusGabungan, tabelKeMarkdown, tahunSah, teksDokumen, urutkanUntukGenerate, type RujukanPeriksa, type StatusIsi,
  type TabelSistem,
} from "@/modules/led/domain/narasi";
import { kodeSumberSah, periksaKeluaran, susunPengguna, susunSistem, type KonteksSubBagian } from "@/modules/led/domain/prompt";
import { formatTahunAkademik, gantiLabelTS, petaTS } from "@/modules/bersama/domain/tahun-akademik";
import { GalatSementara, panggilNarasi } from "@/modules/led/proses/llm-narasi";

/**
 * Mesin penyusun (F-13): menyusun konteks satu sub-bagian, memanggil LLM, mengubah keluaran ke dokumen Tiptap,
 * menjalankan pemeriksaan otomatis, lalu menyimpan versi baru (F-17). Tugas generate (TugasGenerate) memproses
 * daftar sub-bagian berurutan dan bisa berhenti rapi (kunci habis) lalu lanjut dari indeks terakhir.
 */

const TARGET_CADANGAN = 250;

/** Pengguna sistem untuk memakai fungsi data yang memeriksa peran (worker tidak punya sesi): Tim Prodi pemilik LED. */
function penggunaSistem(prodiId: string): Pengguna {
  return { id: "sistem", nama: "Sistem", email: "", peran: "TIM_PRODI", prodiId };
}

const fmtTanggalPrompt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Konteks Bab II.A: susunan tim penyusun (jabatan, tugas, jumlah; nama dan NIP/NIDN tidak dikirim ke LLM) dan
 * tonggak jadwal kerja yang dihitung mundur dari batas pengajuan.
 */
export function konteksTimDanJadwal(
  proyek: { timPenyusun: unknown; batasPengajuan: Date | null; jadwal: unknown },
  legenda: Record<string, string>,
): KonteksSubBagian["metrik"] {
  const hasil: KonteksSubBagian["metrik"] = [];
  const tim = bacaTim(proyek.timPenyusun);
  const ringkasTim = (daftar: { jabatan: string | null; tugas: string | null }[]) => {
    const per = new Map<string, { n: number; tugas: Set<string> }>();
    for (const x of daftar) {
      const k = x.jabatan?.trim() || "Anggota";
      const v = per.get(k) ?? { n: 0, tugas: new Set<string>() };
      v.n += 1;
      if (x.tugas?.trim()) v.tugas.add(x.tugas.trim());
      per.set(k, v);
    }
    return [...per].map(([j, v]) => `${j} (${v.n} orang)${v.tugas.size ? `: ${[...v.tugas].join("; ")}` : ""}`).join(" | ");
  };
  if (tim.dosen.length || tim.tendik.length) {
    legenda["M-TIM"] = "Tim penyusun (menu Tim penyusun)";
    hasil.push({
      id: "M-TIM", nama: "Susunan tim penyusun",
      nilaiTeks: `${tim.dosen.length} dosen, ${tim.tendik.length} tenaga kependidikan`,
      keterangan: [tim.dosen.length ? `Dosen: ${ringkasTim(tim.dosen)}` : "", tim.tendik.length ? `Tenaga kependidikan: ${ringkasTim(tim.tendik)}` : ""].filter(Boolean).join(". "),
    });
  }
  if (proyek.batasPengajuan) {
    legenda["M-JADWAL"] = "Jadwal kerja LED (dihitung mundur dari batas pengajuan)";
    const t = jadwalMundur(proyek.batasPengajuan, (proyek.jadwal ?? {}) as Record<string, string>);
    hasil.push({
      id: "M-JADWAL", nama: "Jadwal kerja penyusunan LED",
      nilaiTeks: `batas pengajuan ${fmtTanggalPrompt.format(proyek.batasPengajuan)}`,
      keterangan: t.map((x) => `${x.nama}: ${fmtTanggalPrompt.format(new Date(`${x.tanggal}T00:00:00Z`))}`).join("; "),
    });
  }
  return hasil;
}

/** Teks tiap kode sumber (dipotong) untuk verifikasi per kalimat; disimpan bersama versi draf (revisi 22 Okt 2026). */
export function teksSumberKonteks(k: KonteksSubBagian): Record<string, string> {
  const potong = (s: string) => s.slice(0, MAKS_TEKS_SUMBER);
  const hasil: Record<string, string> = {};
  if (k.jawabanForm) hasil.J = potong(k.jawabanForm);
  for (const p of k.potongan) hasil[p.id] = potong(`${p.sumber}\n${p.teks}`);
  for (const t of k.tabel) hasil[t.id] = potong(`${t.judul}\n${t.markdown}`);
  for (const m of k.metrik) hasil[m.id] = potong(`${m.nama} = ${m.nilaiTeks}${m.keterangan ? ` (${m.keterangan})` : ""}`);
  return hasil;
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
  // revisi 19 Okt 2026: rumus lewat kodeRumus butir; tanpa rumus atau rumus gagal membaca LKPS → nilai manual PJ
  const nilai = (await nilaiButirUntukProyek(proyek)).daftar.filter((n) => butir.some((b) => b.kode === n.butir));
  const metrikButir: HasilButirAngka[] = nilai.flatMap((n) => (n.sumber === "rumus" && n.hasil ? [n.hasil] : []));
  const manualButir = nilai.filter((n) => n.sumber === "manual" && n.manual);
  const metrik: KonteksSubBagian["metrik"] = [
    ...metrikButir.flatMap((h) => h.metrik.filter((m) => m.nilai !== null).map((m) => {
      legenda[m.kode] = `Metrik sistem: ${m.nama}`;
      return { id: m.kode, nama: m.nama, nilaiTeks: formatMetrik(m), keterangan: m.rumus };
    })),
    ...manualButir.map((n) => {
      const id = kodeSumberManual(n.butir);
      legenda[id] = `Nilai hitung butir ${n.butir} diisi penyusun`;
      return { id, nama: `Nilai hitung butir ${n.butir} (diisi penyusun)`, nilaiTeks: n.manual!.nilai, keterangan: n.manual!.keterangan ?? undefined };
    }),
  ];
  // revisi 22 Okt 2026: capaian terhadap target dan tren tiga tahun, dihitung sistem (bukan AI)
  const capaian = await capaianButirUntukProyek(proyek);
  for (const b of butir.filter((x) => x.jenis === "angka")) {
    const c = capaian.get(b.kode);
    if (c?.hasil) {
      const id = `M-CAPAIAN-${b.kode}`;
      legenda[id] = `Capaian butir ${b.kode} terhadap target${c.target?.sumber ? ` (${c.target.sumber})` : ""}, dihitung sistem`;
      metrik.push({
        id, nama: `Capaian butir ${b.kode} terhadap target`, nilaiTeks: teksCapaian(c.hasil, c.satuanCapaian ?? c.target?.satuan ?? null),
        keterangan: c.target?.sumber ? `target dari ${c.target.sumber}` : undefined,
      });
    }
    if (c?.tren.length) {
      const id = `M-TREN-${b.kode}`;
      legenda[id] = `Tren tiga tahun butir ${b.kode} dari LKPS, dihitung sistem`;
      metrik.push({ id, nama: `Tren tiga tahun butir ${b.kode}`, nilaiTeks: c.tren.map(teksTren).join("; ") });
    }
  }
  for (const n of nilai.filter((x) => x.sumber === "belum" && x.perluManual)) {
    catatan.push(`Butir ${n.butir}: ${n.alasan ?? "nilai hitung belum ada."}`);
  }
  // revisi 22 Okt 2026: Bab II.A memakai jadwal kerja dan susunan tim penyusun (tanpa nama dan nomor induk)
  if (s.bagian.kode === "II.A") metrik.push(...konteksTimDanJadwal(proyek, legenda));
  const kodeTabel = new Set(butir.flatMap((b) => b.tabelLkps));
  const tabel = tabelLkps.filter((t) => kodeTabel.has(t.kode)).map((t) => {
    const judul = `Tabel ${t.kode}${t.blok ? ` (${t.blok})` : ""} ${t.judul}`.trim();
    legenda[`T-${t.sheet}`] = `LKPS ${judul}`;
    return { id: `T-${t.sheet}`, judul, markdown: tabelKeMarkdown(t, ts) };
  });
  if (kodeTabel.size > 0 && !berkas) catatan.push("LKPS belum diunggah: tabel dan metrik tidak tersedia.");

  // potongan dokumen (RAG)
  const kueri = kueriGenerate(s.judul, instruksi, butir);
  const cari = await cariPotongan(penggunaSistem(proyek.prodiId), proyekId, kueri, { subBagianKode, k: 8 });
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

  const tabelSistem: TabelSistem[] = [
    ...metrikButir.map((h) => ({
      judul: `Butir ${h.butir}. ${h.judul}`,
      kepala: ["Metrik", "Nilai"],
      baris: h.metrik.map((m) => [m.nama, formatMetrik(m)]),
      sumber: h.metrik.map((m) => m.kode),
    })),
    ...manualButir.map((n) => ({
      judul: `Butir ${n.butir}. Nilai hitung`,
      kepala: ["Keterangan", "Nilai"],
      baris: [[n.manual!.keterangan ?? "Diisi penyusun", n.manual!.nilai]],
      sumber: [kodeSumberManual(n.butir)],
    })),
  ];
  const nilaiMetrik = metrikButir.flatMap((h) => h.metrik.map((m) => m.nilai).filter((v): v is number => v !== null));
  const rujukan: RujukanPeriksa = {
    angkaSah: kumpulkanAngkaSah(konteks, nilaiMetrik),
    tahunSah: tahunSah(ts),
    target,
    sumberSah: [...kodeSumberSah(konteks)],
    teksSumber: teksSumberKonteks(konteks),
  };
  return { konteks, rujukan, tabelSistem, legenda, catatan, sub: { id: s.id, kode: s.kode, bagianKode: s.bagian.kode } };
}

/** Generate satu sub-bagian dan simpan sebagai versi baru. */
export async function generateSubBagian(
  proyekId: string,
  subBagianKode: string,
  opsi: { tugasId?: string | null; dibuatOlehId?: string | null; onSebagian?: (sebagian: unknown) => void } = {},
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
    onSebagian: opsi.onSebagian,
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

/** Teks keluaran sebagian (paragraf yang sudah ditulis) untuk pratinjau bertahap. */
export function teksSebagian(sebagian: unknown): string {
  const p = (sebagian as { paragraf?: ({ teks?: string } | undefined)[] } | null)?.paragraf ?? [];
  return p.map((x) => x?.teks ?? "").filter(Boolean).join("\n\n");
}

const JEDA_PRATINJAU_MS = 1200;

/**
 * Penulis pratinjau satu sub-bagian: menyimpan teks yang sedang ditulis ke `TugasGenerate.pratinjau[kode]` paling
 * sering sekali per 1,2 detik. Digabung dengan jsonb `||` supaya dua sub-bagian yang ditulis bersamaan tidak saling menimpa.
 */
function penulisPratinjau(tugasId: string, kode: string) {
  let terakhir = 0;
  let antre: Promise<unknown> = Promise.resolve();
  const tulis = (teks: string) => {
    antre = antre.then(() => prisma.$executeRaw`
      UPDATE "TugasGenerate"
      SET "pratinjau" = COALESCE("pratinjau", '{}'::jsonb) || jsonb_build_object(${kode}::text, jsonb_build_object('teks', ${teks}::text, 'diperbarui', now()))
      WHERE id = ${tugasId}`).catch(() => undefined);
  };
  return {
    onSebagian(sebagian: unknown) {
      const sekarang = Date.now();
      if (sekarang - terakhir < JEDA_PRATINJAU_MS) return;
      const teks = teksSebagian(sebagian);
      if (!teks) return;
      terakhir = sekarang;
      tulis(teks);
    },
    async hapus() {
      await antre;
      await prisma.$executeRaw`UPDATE "TugasGenerate" SET "pratinjau" = "pratinjau" - ${kode}::text WHERE id = ${tugasId}`.catch(() => undefined);
    },
  };
}

/** Keluaran dialirkan (streaming) supaya teks tampil bertahap; GENERATE_STREAM=0 mematikannya. */
function pakaiAliran(): boolean {
  return process.env.GENERATE_STREAM !== "0";
}

/** Jumlah sub-bagian indikator kinerja yang dikerjakan bersamaan (revisi 22 Okt 2026; bawaan 2). */
function jumlahParalel(): number {
  const n = Number(process.env.GENERATE_PARALEL);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 4) : 2;
}

/** Kelompok berikutnya mulai indeks i: sub-bagian IKU berurutan dikerjakan bersamaan; AF, SWOT, dll. satu per satu. */
export function kelompokGenerate(kode: string[], i: number, paralel: number): string[] {
  const iku = (k: string) => /-IKU-/.test(k);
  const grup = [kode[i]];
  if (!iku(kode[i])) return grup;
  while (grup.length < paralel && i + grup.length < kode.length && iku(kode[i + grup.length])) grup.push(kode[i + grup.length]);
  return grup;
}

/**
 * Kerjakan tugas generate dari indeks terakhir. Hanya tugas berstatus antre/tertunda yang diambil (mencegah
 * dua worker mengerjakan tugas yang sama). Berhenti rapi bila kunci habis (tertunda) dan lanjut dari sub-bagian itu.
 * Revisi 22 Okt 2026: sub-bagian IKU dikerjakan dua sekaligus; teks yang sedang ditulis disimpan sebagai pratinjau.
 */
export async function prosesTugasGenerate(tugasId: string): Promise<string> {
  const klaim = await ubahTugas(tugasId, ["antre", "tertunda"], { status: "berjalan", pesan: null, dilanjutkanPada: null });
  if (klaim.count === 0) return "dilewati";
  const tugas = await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: tugasId }, include: { proyek: true } });
  const paralel = jumlahParalel();
  try {
    return await kerjakanTugas(tugas, paralel);
  } finally {
    await prisma.tugasGenerate.update({ where: { id: tugasId }, data: { pratinjau: Prisma.DbNull } }).catch(() => undefined);
  }
}

async function kerjakanTugas(
  tugas: { id: string; proyekId: string; indeks: number; subBagianKode: string[]; dibuatOlehId: string | null },
  paralel: number,
): Promise<string> {
  const tugasId = tugas.id;
  for (let i = tugas.indeks; i < tugas.subBagianKode.length;) {
    const kini = await prisma.tugasGenerate.findUnique({ where: { id: tugasId }, select: { status: true } });
    if (!kini || kini.status !== "berjalan") return kini?.status ?? "dibatalkan";
    const grup = kelompokGenerate(tugas.subBagianKode, i, paralel);
    const hasil = await Promise.allSettled(grup.map(async (kode) => {
      const pratinjau = penulisPratinjau(tugasId, kode);
      try {
        await generateSubBagian(tugas.proyekId, kode, {
          tugasId, dibuatOlehId: tugas.dibuatOlehId, onSebagian: pakaiAliran() ? pratinjau.onSebagian : undefined,
        });
      } finally {
        await pratinjau.hapus();
      }
    }));
    const gagal = hasil.findIndex((r) => r.status === "rejected");
    if (gagal === -1) {
      i += grup.length;
      await prisma.tugasGenerate.update({ where: { id: tugasId }, data: { indeks: i } });
      continue;
    }
    // sub-bagian sebelum yang gagal sudah selesai; lanjutkan dari yang gagal
    if (gagal > 0) await prisma.tugasGenerate.update({ where: { id: tugasId }, data: { indeks: i + gagal } });
    const kode = grup[gagal];
    const e = (hasil[gagal] as PromiseRejectedResult).reason;
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
