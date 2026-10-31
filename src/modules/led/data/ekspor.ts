import JSZip from "jszip";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatAkses, GalatPengguna, pastikanPenanggungJawab, type Pengguna } from "@/modules/bersama/akses";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { ambilProyek, ambilProyekUbah } from "@/modules/led/data/proyek";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { periksaSebelumEkspor, type HasilPeriksaEkspor } from "@/modules/led/domain/ekspor";
import { KODE_JENJANG } from "@/modules/bersama/domain/jenjang";
import { bacaDokumen } from "@/modules/led/domain/narasi";
import { lokasiSoffice } from "@/modules/led/ekspor/halaman";
import { bacaTemplateVersi, bacaTim, siapkanTemplate, subBagianTemplate, type JenisEkspor } from "@/modules/led/proses/ekspor";
import { dokumenDirujuk, namaDokumen, type DokumenRujukan } from "@/modules/led/domain/rujukan";
import { bacaStatusReview } from "@/modules/led/domain/kesiapan";
import { konsistensiUntukProyek, type PerbedaanBeralasan } from "@/modules/led/data/konsistensi";
import { skemaTimPenyusun, type MasukanTimPenyusun } from "@/modules/led/validasi";

/**
 * Ekspor Word (F-22–F-24) dan template LED per versi instrumen; semuanya dikelola PJ fakultas.
 */

// ------------------------------------------------------------------ tim penyusun

export async function timPenyusun(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  return bacaTim(proyek.timPenyusun);
}

export async function simpanTimPenyusun(p: Pengguna, proyekId: string, masukan: MasukanTimPenyusun) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const tim = skemaTimPenyusun.parse(masukan);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { timPenyusun: tim as unknown as Prisma.InputJsonValue } });
  await catatAktivitas(p, "ubah_tim", "proyek", proyek.id, { dosen: tim.dosen.length, tendik: tim.tendik.length });
  return tim;
}

// ------------------------------------------------------------------ pemeriksaan dan ekspor

export interface PeriksaEkspor extends HasilPeriksaEkspor {
  templateAda: boolean;
  libreOffice: boolean;
  /** dokumen yang dirujuk narasi tetapi belum punya tautan bukti (wajib sebelum ekspor final) */
  tanpaTautan: { id: string; judul: string; bersama: boolean }[];
  /** perbedaan angka antar kriteria (wajib diperbaiki atau diberi alasan sebelum ekspor final) */
  konsistensi: PerbedaanBeralasan[];
  jenis: JenisEkspor;
}

/** Dokumen (LED dan bersama fakultas) yang dirujuk narasi aktif LED, urut kemunculan pertama. */
export async function dokumenDirujukProyek(proyekId: string): Promise<DokumenRujukan[]> {
  const draf = await prisma.bagianDraf.findMany({ where: { proyekId, versiAktifId: { not: null } }, select: { versiAktifId: true } });
  const versi = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } }, select: { isi: true, sumber: true } });
  const dokumen = await prisma.dokumen.findMany({
    where: { OR: [{ proyekId }, { proyekId: null }] },
    select: { id: true, judul: true, namaBerkas: true, tahunTerbit: true, tautanBukti: true, proyekId: true },
  });
  return dokumenDirujuk(
    versi.map((v) => ({ isi: bacaDokumen(v.isi), legenda: (v.sumber ?? {}) as Record<string, string> })),
    dokumen.map((d) => ({ id: d.id, judul: d.judul, namaBerkas: d.namaBerkas, tahunTerbit: d.tahunTerbit, tautanBukti: d.tautanBukti, bersama: d.proyekId === null })),
  );
}

/**
 * Pemeriksaan sebelum ekspor (ditampilkan di halaman Ekspor dan dijalankan ulang saat ekspor dimulai).
 * Revisi 22 Okt 2026: ekspor DRAF bisa kapan saja (hal yang belum lengkap hanya peringatan); ekspor final butuh
 * semua pemeriksaan lolos, semua dokumen yang dirujuk punya tautan bukti, dan status Layak diajukan dari asesor.
 */
export async function periksaEkspor(p: Pengguna, proyekId: string, jenis: JenisEkspor = "final"): Promise<PeriksaEkspor> {
  const proyek = await ambilProyek(p, proyekId);
  const versi = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: proyek.versiId } });
  const sub = (await subBagianTemplate(proyek.versiId, proyek.jenjang)).filter((s) => s.berlaku && s.tipe !== "data" && s.tipe !== "otomatis");
  const bagianKode = [...new Set(sub.map((s) => s.bagianKode))];
  const status = new Map(proyek.status.map((s) => [s.bagianKode, s.status]));
  const draf = await prisma.bagianDraf.findMany({ where: { proyekId: proyek.id, versiAktifId: { not: null } }, select: { subBagianId: true, versiAktifId: true } });
  const versiDraf = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } }, select: { id: true, isi: true } });
  const isi = new Map(draf.map((d) => [d.subBagianId, versiDraf.find((v) => v.id === d.versiAktifId)?.isi]));
  const hasil = periksaSebelumEkspor(
    bagianKode.map((k) => ({
      kode: k,
      nama: sub.find((s) => s.bagianKode === k)!.bagianNama,
      status: status.get(k) ?? "belum",
      jumlahSub: sub.filter((s) => s.bagianKode === k).length,
    })),
    sub.map((s) => ({ kode: s.kode, label: s.label, bagianKode: s.bagianKode, doc: isi.has(s.id) ? bacaDokumen(isi.get(s.id)) : null })),
  );
  const tim = bacaTim(proyek.timPenyusun);
  if (tim.dosen.length === 0) hasil.galat.push("Tim penyusun (dosen) belum diisi di menu Tim penyusun.");
  const templateAda = Boolean(versi.templateLedLokasi || process.env.TEMPLATE_LEDPS_PATH);
  if (!templateAda) hasil.galat.push("Template LED belum diunggah untuk instrumen ini (menu Instrumen).");
  const dirujuk = await dokumenDirujukProyek(proyek.id);
  const tanpaTautan = dirujuk.filter((d) => !d.tautanBukti).map((d) => ({ id: d.id, judul: namaDokumen(d), bersama: d.bersama }));
  if (tanpaTautan.length) {
    hasil.galat.push(`${tanpaTautan.length} dokumen yang dirujuk narasi belum punya tautan bukti sahih: ${tanpaTautan.map((d) => d.judul).join("; ")}.`);
  }
  const konsistensi = await konsistensiUntukProyek(proyek);
  const tanpaAlasan = konsistensi.filter((x) => !x.alasan);
  if (tanpaAlasan.length) {
    hasil.galat.push(`${tanpaAlasan.length} angka tidak konsisten dengan LKPS atau sub-bagian lain; perbaiki narasinya atau beri alasan.`);
  }
  if (bacaStatusReview(proyek.statusReview) !== "layak") {
    hasil.galat.push("Ekspor final terbuka setelah asesor menyatakan Layak diajukan. Sebelum itu gunakan Ekspor DRAF.");
  }
  const libreOffice = lokasiSoffice() !== null;
  if (!libreOffice) hasil.peringatan.push("LibreOffice belum terpasang di server: jumlah halaman akan diperkirakan, bukan dihitung.");
  if (jenis === "draf") {
    // draf: hanya template yang wajib; hal lain menjadi peringatan
    const wajib = hasil.galat.filter((g) => /^Template LED belum diunggah/.test(g));
    hasil.peringatan.unshift(...hasil.galat.filter((g) => !wajib.includes(g)));
    hasil.galat = wajib;
  }
  return { ...hasil, templateAda, libreOffice, tanpaTautan, konsistensi, jenis };
}

/** Mulai ekspor DRAF atau final: ditolak bila pemeriksaan jenis itu menemukan galat. Berkas dibuat worker. */
export async function mulaiEkspor(p: Pengguna, proyekId: string, jenis: JenisEkspor = "final") {
  const proyek = await ambilProyek(p, proyekId);
  const berjalan = await prisma.ekspor.findFirst({ where: { proyekId: proyek.id, status: { in: ["antre", "diproses"] } } });
  if (berjalan) throw new GalatPengguna("Ekspor sebelumnya masih diproses. Tunggu sampai selesai.");
  const cek = await periksaEkspor(p, proyekId, jenis);
  if (cek.galat.length > 0) {
    throw new GalatPengguna(`Ekspor ${jenis === "draf" ? "DRAF" : "final"} ditolak: ${cek.galat.length} hal perlu diselesaikan dulu (lihat daftar pemeriksaan).`);
  }
  const e = await prisma.ekspor.create({
    data: { proyekId: proyek.id, status: "antre", jenis, dibuatOlehId: p.id, pemeriksaan: { galat: [], peringatan: cek.peringatan } },
  });
  await kirimTugas(ANTREAN.ekspor, { eksporId: e.id });
  await catatAktivitas(p, "ekspor", "proyek", proyek.id, { eksporId: e.id, jenis });
  return e;
}

export async function daftarEkspor(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  return prisma.ekspor.findMany({ where: { proyekId: proyek.id }, orderBy: { createdAt: "desc" }, take: 20 });
}

async function eksporMilik(p: Pengguna, eksporId: string) {
  const e = await prisma.ekspor.findUnique({ where: { id: eksporId } });
  if (!e) throw new GalatAkses("Berkas ekspor tidak ditemukan.");
  await ambilProyek(p, e.proyekId);
  return e;
}

/** Berkas hasil ekspor (hanya yang siap; ekspor > 150 halaman ditahan). */
export async function berkasEkspor(p: Pengguna, eksporId: string) {
  const e = await eksporMilik(p, eksporId);
  if (e.status !== "siap" || !e.lokasi) throw new GalatPengguna("Berkas ini belum siap diunduh.");
  return { ekspor: e, isi: await bacaBerkas(e.lokasi) };
}

export async function hapusEkspor(p: Pengguna, eksporId: string) {
  const e = await eksporMilik(p, eksporId);
  if (e.status === "antre" || e.status === "diproses") throw new GalatPengguna("Ekspor masih diproses.");
  await prisma.ekspor.delete({ where: { id: e.id } });
  if (e.lokasi) await hapusBerkas(e.lokasi).catch(() => undefined);
}

// ------------------------------------------------------------------ template per versi (PJ, menu Instrumen)

export const UKURAN_MAKS_TEMPLATE = 30 * 1024 * 1024;

/** Laporan penyiapan template untuk setiap jenjang yang dikenal versi. */
async function laporanTemplate(versiId: string, isi: Buffer, jenjangVersi: string[]) {
  const hasil: Record<string, { placeholder: number; dihapus: string[]; tidakDitemukan: string[] }> = {};
  for (const j of jenjangVersi) {
    const sub = await subBagianTemplate(versiId, j);
    const { laporan } = await siapkanTemplate(isi, sub);
    hasil[j] = { placeholder: laporan.placeholder.length, dihapus: laporan.dihapus, tidakDitemukan: laporan.tidakDitemukan };
  }
  return hasil;
}

export async function unggahTemplateLed(p: Pengguna, versiId: string, berkas: { nama: string; isi: Buffer }) {
  pastikanPenanggungJawab(p);
  const versi = await prisma.versiInstrumen.findUnique({ where: { id: versiId } });
  if (!versi) throw new GalatPengguna("Versi instrumen tidak ditemukan.");
  if (berkas.isi.length > UKURAN_MAKS_TEMPLATE) throw new GalatPengguna("Berkas template terlalu besar (maks. 30 MB).");
  if (!/\.docx$/i.test(berkas.nama)) throw new GalatPengguna("Template harus berupa berkas Word .docx.");
  try {
    const zip = await JSZip.loadAsync(berkas.isi);
    if (!zip.file("word/document.xml")) throw new Error();
  } catch {
    throw new GalatPengguna("Berkas bukan dokumen Word (.docx) yang sah.");
  }
  const jenjang = versi.jenjangUtama ? [versi.jenjangUtama]
    : ((versi.jenjang ?? []) as { kode: string }[]).map((x) => x.kode).filter((k) => (KODE_JENJANG as readonly string[]).includes(k));
  const laporan = await laporanTemplate(versi.id, berkas.isi, jenjang.length ? jenjang : ["S1"]);
  const simpan = await simpanBerkas(`template/${versi.id}`, berkas.nama, berkas.isi);
  if (versi.templateLedLokasi) await hapusBerkas(versi.templateLedLokasi).catch(() => undefined);
  await prisma.versiInstrumen.update({
    where: { id: versi.id },
    data: { templateLedLokasi: simpan.lokasi, templateLedNama: berkas.nama, templateLedLaporan: laporan as unknown as Prisma.InputJsonValue },
  });
  await catatAktivitas(p, "unggah_template", "versi_instrumen", versi.id, { nama: berkas.nama });
  return laporan;
}

/** Hitung ulang laporan penyiapan template (setelah sub-bagian versi berubah, mis. selesai ekstraksi). */
export async function perbaruiLaporanTemplate(versiId: string): Promise<void> {
  const versi = await prisma.versiInstrumen.findUnique({ where: { id: versiId } });
  if (!versi?.templateLedLokasi) return;
  const isi = await bacaBerkas(versi.templateLedLokasi);
  const jenjang = versi.jenjangUtama ? [versi.jenjangUtama]
    : ((versi.jenjang ?? []) as { kode: string }[]).map((x) => x.kode).filter((k) => (KODE_JENJANG as readonly string[]).includes(k));
  const laporan = await laporanTemplate(versi.id, isi, jenjang.length ? jenjang : ["S1"]);
  await prisma.versiInstrumen.update({ where: { id: versi.id }, data: { templateLedLaporan: laporan as unknown as Prisma.InputJsonValue } });
}

/** Laporan template untuk halaman versi (dihitung dari template cadangan bila belum ada unggahan). */
export async function infoTemplateLed(p: Pengguna, versiId: string) {
  pastikanPenanggungJawab(p);
  const versi = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versiId } });
  const laporan = versi.templateLedLaporan as Record<string, { placeholder: number; dihapus: string[]; tidakDitemukan: string[] }> | null;
  const cadangan = !versi.templateLedLokasi && Boolean(process.env.TEMPLATE_LEDPS_PATH) && Boolean(await bacaTemplateVersi(versi));
  return { nama: versi.templateLedNama, laporan, cadangan };
}
