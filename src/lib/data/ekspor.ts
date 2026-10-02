import JSZip from "jszip";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatAkses, GalatPengguna, pastikanSuperAdmin, type Pengguna } from "@/lib/akses";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { catatAktivitas } from "@/lib/data/log";
import { ambilProyek } from "@/lib/data/proyek";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/lib/penyimpanan";
import { periksaSebelumEkspor, type HasilPeriksaEkspor } from "@/lib/domain/ekspor";
import { KODE_JENJANG } from "@/lib/domain/instrumen";
import { bacaDokumen } from "@/lib/domain/narasi";
import { lokasiSoffice } from "@/lib/ekspor/halaman";
import { bacaTemplateVersi, bacaTim, siapkanTemplate, subBagianTemplate } from "@/lib/proses/ekspor";
import { skemaTimPenyusun, type MasukanTimPenyusun } from "@/lib/validasi";

/**
 * Ekspor Word untuk penanggung jawab (F-22–F-24) dan template LEDPS per versi untuk super admin.
 */

// ------------------------------------------------------------------ tim penyusun

export async function timPenyusun(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  return bacaTim(proyek.timPenyusun);
}

export async function simpanTimPenyusun(p: Pengguna, proyekId: string, masukan: MasukanTimPenyusun) {
  const proyek = await ambilProyek(p, proyekId);
  const tim = skemaTimPenyusun.parse(masukan);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { timPenyusun: tim as unknown as Prisma.InputJsonValue } });
  await catatAktivitas(p, "ubah_tim", "proyek", proyek.id, { dosen: tim.dosen.length, tendik: tim.tendik.length });
  return tim;
}

// ------------------------------------------------------------------ pemeriksaan dan ekspor

export interface PeriksaEkspor extends HasilPeriksaEkspor {
  templateAda: boolean;
  libreOffice: boolean;
}

/** Pemeriksaan sebelum ekspor (ditampilkan di halaman Ekspor dan dijalankan ulang saat ekspor dimulai). */
export async function periksaEkspor(p: Pengguna, proyekId: string): Promise<PeriksaEkspor> {
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
  if (!templateAda) hasil.galat.push("Template LEDPS belum diunggah super admin untuk versi instrumen ini.");
  const tautan = await prisma.dokumen.count({ where: { proyekId: proyek.id, tautanBukti: { not: null } } });
  if (tautan === 0) hasil.peringatan.push("Belum ada tautan bukti sahih (Lampiran). Isi tautan penyimpanan awan pada dokumen di menu Dokumen.");
  const libreOffice = lokasiSoffice() !== null;
  if (!libreOffice) hasil.peringatan.push("LibreOffice belum terpasang di server: jumlah halaman akan diperkirakan, bukan dihitung.");
  return { ...hasil, templateAda, libreOffice };
}

/** Mulai ekspor: ditolak bila pemeriksaan menemukan galat. Berkas dibuat worker. */
export async function mulaiEkspor(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const berjalan = await prisma.ekspor.findFirst({ where: { proyekId: proyek.id, status: { in: ["antre", "diproses"] } } });
  if (berjalan) throw new GalatPengguna("Ekspor sebelumnya masih diproses. Tunggu sampai selesai.");
  const cek = await periksaEkspor(p, proyekId);
  if (cek.galat.length > 0) {
    throw new GalatPengguna(`Ekspor ditolak: ${cek.galat.length} hal perlu diselesaikan dulu (lihat daftar pemeriksaan).`);
  }
  const e = await prisma.ekspor.create({
    data: { proyekId: proyek.id, status: "antre", dibuatOlehId: p.id, pemeriksaan: { galat: [], peringatan: cek.peringatan } },
  });
  await kirimTugas(ANTREAN.ekspor, { eksporId: e.id });
  await catatAktivitas(p, "ekspor", "proyek", proyek.id, { eksporId: e.id });
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

// ------------------------------------------------------------------ template per versi (super admin)

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
  pastikanSuperAdmin(p);
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
  const jenjang = ((versi.jenjang ?? []) as { kode: string }[]).map((x) => x.kode).filter((k) => (KODE_JENJANG as readonly string[]).includes(k));
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

/** Laporan template untuk halaman versi (dihitung dari template cadangan bila belum ada unggahan). */
export async function infoTemplateLed(p: Pengguna, versiId: string) {
  pastikanSuperAdmin(p);
  const versi = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versiId } });
  const laporan = versi.templateLedLaporan as Record<string, { placeholder: number; dihapus: string[]; tidakDitemukan: string[] }> | null;
  const cadangan = !versi.templateLedLokasi && Boolean(process.env.TEMPLATE_LEDPS_PATH) && Boolean(await bacaTemplateVersi(versi));
  return { nama: versi.templateLedNama, laporan, cadangan };
}
