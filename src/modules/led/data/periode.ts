import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, pastikanTimProdi, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { ambangPengingat } from "@/modules/bersama/domain/akreditasi";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { cariNarasiLalu, dokumenDicentangBawaan, petakanBahan, syaratPeriodeBerikutnya } from "@/modules/led/domain/periode";
import { bacaDokumen, teksDokumen } from "@/modules/led/domain/narasi";
import { berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { dataLedBaru, instrumenAktifUntuk, instrumenWajibAktif } from "@/modules/led/data/proyek";
import { skemaProyek, type MasukanProyek } from "@/modules/led/validasi";

/**
 * Mulai LED periode berikutnya (L4, 2 Nov 2026): satu tombol untuk Tim Prodi. Dalam satu transaksi LED lama diarsipkan
 * dan LED baru dibuat (bahan yang dipilih disalin, L5). Bila gagal di tengah, semuanya dibatalkan sehingga LED lama
 * tidak terlanjur diarsipkan. Tetap satu LED aktif per prodi.
 */

const GENERATE_AKTIF = ["antre", "berjalan", "tertunda"];

/**
 * LED sumber periode berikutnya: LED aktif prodi; bila tidak ada, LED arsip terbaru yang diarsipkan karena hasil
 * akreditasinya dicatat (L1 mengarsipkan LED yang diajukan), supaya bahannya tetap bisa disalin. Ditemukan saat uji
 * alur L6.
 */
async function ledSumber(prodiId: string) {
  const aktif = await prisma.proyekLED.findFirst({ where: { prodiId, diarsipkanPada: null }, orderBy: { createdAt: "desc" } });
  if (aktif) return { led: aktif, sudahDiarsipkan: false };
  const r = await prisma.riwayatAkreditasi.findFirst({ where: { prodiId, status: "berlaku", proyekId: { not: null } }, orderBy: { createdAt: "desc" } });
  const led = r?.proyekId ? await prisma.proyekLED.findUnique({ where: { id: r.proyekId } }) : null;
  // hanya bila belum ada LED yang dibuat sesudahnya (LED periode berikutnya yang sudah dimulai lalu diarsipkan tidak dihitung)
  if (!led || !led.diarsipkanPada || (await prisma.proyekLED.count({ where: { prodiId, createdAt: { gt: led.createdAt } } }))) return null;
  return { led, sudahDiarsipkan: true };
}

/** Keadaan untuk Menu LED dan Pengaturan LED: LED sumber, syarat, dan instrumen yang akan dipakai. */
export async function infoPeriodeBerikutnya(p: Pengguna, hariIni = new Date()) {
  pastikanTimProdi(p);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id: p.prodiId } });
  const sumber = await ledSumber(prodi.id);
  if (!sumber) return null;
  const lama = sumber.led;
  const [hasil, final, versi] = await Promise.all([
    prisma.riwayatAkreditasi.count({ where: { proyekId: lama.id, status: { in: ["menunggu", "berlaku"] } } }),
    prisma.ekspor.count({ where: { proyekId: lama.id, jenis: "final", status: "siap" } }),
    instrumenAktifUntuk(prodi.jenjang),
  ]);
  const syarat = syaratPeriodeBerikutnya({
    ambang: ambangPengingat(prodi.akreditasiBerlakuSampai, hariIni), hasilTercatat: hasil > 0, statusReview: lama.statusReview, eksporFinal: final > 0,
  });
  return { prodi, lama, sudahDiarsipkan: sumber.sudahDiarsipkan, syarat, versi: versi ? { kode: versi.kode, nama: versi.nama } : null };
}

// ---------------------------------------------------------------- L5: bahan yang disalin

export const skemaSalin = z.object({
  /** Tim penyusun (Tabel 2.1/2.2), ditandai "periksa ulang" */
  tim: z.boolean().default(true),
  /** Bahan dari prodi (isian untuk AI) per sub-bagian */
  bahan: z.boolean().default(true),
  /** id dokumen prodi LED lama yang disalin */
  dokumen: z.array(z.string()).max(500).default([]),
  /** narasi periode lalu sebagai sumber P untuk evaluasi capaian dan perbaikan (bawaan mati) */
  narasiLalu: z.boolean().default(false),
});
export type MasukanSalin = z.input<typeof skemaSalin>;

/** Pilihan bahan untuk kartu Mulai LED periode berikutnya: tim, jumlah bahan, dan daftar dokumen prodi LED lama. */
export async function bahanUntukSalin(p: Pengguna, tahunPengajuanBaru: number) {
  pastikanTimProdi(p);
  const lama = (await ledSumber(p.prodiId))?.led;
  if (!lama) return null;
  const tim = (lama.timPenyusun ?? {}) as { dosen?: unknown[]; tendik?: unknown[] };
  const [jumlahBahan, dokumen] = await Promise.all([
    prisma.jawabanForm.count({ where: { proyekId: lama.id, isi: { not: "" } } }),
    prisma.dokumen.findMany({ where: { proyekId: lama.id }, orderBy: [{ tahunTerbit: { sort: "desc", nulls: "last" } }, { namaBerkas: "asc" }] }),
  ]);
  return {
    jumlahTim: (tim.dosen?.length ?? 0) + (tim.tendik?.length ?? 0),
    jumlahBahan,
    dokumen: dokumen.map((d) => ({
      id: d.id, nama: d.judul || d.namaBerkas, tahunTerbit: d.tahunTerbit, dicentang: dokumenDicentangBawaan(d.tahunTerbit, tahunPengajuanBaru),
    })),
  };
}

type Tx = Prisma.TransactionClient;

/** Bahan dari prodi LED lama ke LED baru (kode sama, atau judul sama bila instrumen berganti). */
async function salinBahan(tx: Tx, lama: { id: string; versiId: string; tahunPengajuan: number }, baru: { id: string; versiId: string; jenjang: string }) {
  const [jawaban, subLama, subBaru] = await Promise.all([
    tx.jawabanForm.findMany({ where: { proyekId: lama.id } }),
    tx.subBagian.findMany({ where: { bagian: { versiId: lama.versiId } }, select: { kode: true, judul: true } }),
    tx.subBagian.findMany({ where: { bagian: { versiId: baru.versiId } } }),
  ]);
  const judulLama = new Map(subLama.map((s) => [s.kode, s.judul]));
  const peta = petakanBahan(
    jawaban.map((j) => ({ kode: j.subBagianKode, judul: judulLama.get(j.subBagianKode) ?? j.subBagianKode, isi: j.isi })),
    subBaru.filter((s) => berlakuUntukJenjang(s, baru.jenjang)).map((s) => ({ kode: s.kode, judul: s.judul })),
    lama.tahunPengajuan,
  );
  if (peta.salin.length) await tx.jawabanForm.createMany({ data: peta.salin.map((x) => ({ proyekId: baru.id, subBagianKode: x.kode, isi: x.isi })) });
  return peta;
}

export async function mulaiLedPeriodeBerikutnya(p: Pengguna, masukan: MasukanProyek, pilihan: MasukanSalin = { tim: false, bahan: false }) {
  pastikanTimProdi(p);
  const data = skemaProyek.parse(masukan);
  const salin = skemaSalin.parse(pilihan);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id: p.prodiId } });
  const versi = await instrumenWajibAktif(prodi.jenjang);
  // berkas dokumen disalin (bukan dipindah) sebelum transaksi; bila transaksi gagal, salinannya dihapus lagi
  const sumber = await ledSumber(prodi.id);
  const aktifSekarang = sumber?.led ?? null;
  const dokumenLama = aktifSekarang && salin.dokumen.length
    ? await prisma.dokumen.findMany({ where: { proyekId: aktifSekarang.id, id: { in: salin.dokumen } } })
    : [];
  const salinan: { asal: (typeof dokumenLama)[number]; lokasi: string }[] = [];
  try {
    for (const d of dokumenLama) {
      const s = await simpanBerkas(`proyek/periode/${prodi.id}/dokumen`, d.namaBerkas, await bacaBerkas(d.lokasi));
      salinan.push({ asal: d, lokasi: s.lokasi });
    }
    const hasil = await prisma.$transaction(async (tx) => {
      if (!aktifSekarang) throw new GalatPengguna("Belum ada LED aktif. Gunakan kartu Mulai LED.");
      const aktif = await tx.proyekLED.findFirst({ where: { prodiId: prodi.id, diarsipkanPada: null }, orderBy: { createdAt: "desc" } });
      // LED sumber yang sudah diarsipkan (hasil akreditasi dicatat): tidak boleh ada LED aktif lain
      if ((sumber!.sudahDiarsipkan ? aktif !== null : aktif?.id !== aktifSekarang.id)) {
        throw new GalatPengguna("LED aktif berubah. Muat ulang halaman lalu coba lagi.");
      }
      const lama = aktifSekarang;
      if (await tx.tugasGenerate.count({ where: { proyekId: lama.id, status: { in: GENERATE_AKTIF } } })) {
        throw new GalatPengguna(`Masih ada penyusunan berjalan di ${lama.nama}. Tunggu selesai atau batalkan dulu; LED lama tidak diarsipkan.`);
      }
      if (!sumber!.sudahDiarsipkan) await tx.proyekLED.update({ where: { id: lama.id }, data: { diarsipkanPada: new Date() } });
      const timLama = (lama.timPenyusun ?? null) as Record<string, unknown> | null;
      const baru = await tx.proyekLED.create({
        data: {
          ...dataLedBaru(prodi, versi, data),
          asalProyekId: lama.id,
          pakaiNarasiLalu: salin.narasiLalu,
          // tim disalin lalu ditandai "periksa ulang"; tanda hilang setelah Tim Prodi menyimpan Tim penyusun
          ...(salin.tim && timLama ? { timPenyusun: { ...timLama, periksaUlang: true } as Prisma.InputJsonValue } : {}),
        },
      });
      const bahan = salin.bahan ? await salinBahan(tx, lama, baru) : { salin: [], belum: [] };
      if (bahan.belum.length) {
        await tx.proyekLED.update({ where: { id: baru.id }, data: { bahanBelumDipindah: bahan.belum as unknown as Prisma.InputJsonValue } });
      }
      const dokumenBaru = [];
      for (const { asal, lokasi } of salinan) {
        dokumenBaru.push(await tx.dokumen.create({
          data: {
            proyekId: baru.id, subBagianKode: asal.subBagianKode, butirKode: asal.butirKode, namaBerkas: asal.namaBerkas, mime: asal.mime,
            lokasi, ukuran: asal.ukuran, tautanBukti: asal.tautanBukti, tahunTerbit: asal.tahunTerbit, jenis: asal.jenis, judul: asal.judul,
            hash: asal.hash, status: "diunggah", diunggahOlehId: p.id,
            // dokumen diharapkan milik versi instrumen; hanya dibawa bila versinya sama
            dokumenDiharapkanId: lama.versiId === baru.versiId ? asal.dokumenDiharapkanId : null,
          },
        }));
      }
      return { lama, baru, bahan, dokumen: dokumenBaru };
    });
    // diproses ulang (pemotongan dan embedding) lewat antrean
    for (const d of hasil.dokumen) await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
    await catatAktivitas(p, "mulai_periode_berikutnya", "proyek", hasil.baru.id, {
      lama: hasil.lama.nama, baru: hasil.baru.nama, versi: versi.kode,
      tim: salin.tim, bahan: hasil.bahan.salin.length, bahanBelum: hasil.bahan.belum.length, dokumen: hasil.dokumen.length, narasiLalu: salin.narasiLalu,
    });
    return hasil;
  } catch (e) {
    for (const x of salinan) await hapusBerkas(x.lokasi).catch(() => undefined);
    throw e;
  }
}

/**
 * Narasi final sub-bagian yang sama (atau judulnya mirip) di LED periode lalu, hanya baca (L5). LED periode lalu = asal
 * LED ini, atau LED arsip prodi terbaru bila LED ini tidak dibuat lewat Mulai LED periode berikutnya.
 */
export async function narasiPeriodeLalu(proyek: { id: string; prodiId: string; asalProyekId: string | null }, sub: { kode: string; judul: string }) {
  const lalu = proyek.asalProyekId
    ? await prisma.proyekLED.findUnique({ where: { id: proyek.asalProyekId } })
    : await prisma.proyekLED.findFirst({ where: { prodiId: proyek.prodiId, NOT: { id: proyek.id }, diarsipkanPada: { not: null } }, orderBy: { tahunPengajuan: "desc" } });
  if (!lalu) return null;
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId: lalu.id, versiAktifId: { not: null } },
    include: { subBagian: { select: { kode: true, judul: true } } },
  });
  const cocok = cariNarasiLalu(draf.map((d) => ({ kode: d.subBagian.kode, judul: d.subBagian.judul, versiAktifId: d.versiAktifId! })), sub);
  if (!cocok) return null;
  const versi = await prisma.versiDraf.findUnique({ where: { id: cocok.versiAktifId }, select: { isi: true } });
  const teks = versi ? teksDokumen(bacaDokumen(versi.isi), { tanpaTabel: true }).trim() : "";
  return teks ? { led: lalu.nama, tahunPengajuan: lalu.tahunPengajuan, judul: cocok.judul, kode: cocok.kode, teks } : null;
}
