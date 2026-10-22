"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import { aturArsipProyek, buatProyek, hapusProyek, simpanJawaban, ubahNamaProyek, ubahTahunPengajuan, ubahTsProyek } from "@/lib/data/proyek";
import type { MasukanProyek, MasukanTimPenyusun } from "@/lib/validasi";
import * as lkps from "@/lib/data/lkps";
import * as dokumen from "@/lib/data/dokumen";
import * as pencarian from "@/lib/data/pencarian";
import * as generate from "@/lib/data/generate";
import * as ekspor from "@/lib/data/ekspor";
import { simpanNilaiManual } from "@/lib/data/nilai-butir";
import { simpanJadwal } from "@/lib/data/kesiapan";

export async function aksiBuatProyek(masukan: MasukanProyek) {
  const r = await jalankanAksi(async (p) => (await buatProyek(p, masukan)).id);
  revalidatePath("/proyek");
  return r;
}

export async function aksiUbahTahunPengajuan(proyekId: string, tahun: number) {
  const r = await jalankanAksi((p) => ubahTahunPengajuan(p, proyekId, tahun).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}

export async function aksiUbahTs(proyekId: string, tsTahunMulai: number) {
  const r = await jalankanAksi((p) => ubahTsProyek(p, proyekId, tsTahunMulai).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

/** Simpan otomatis jawaban form; tidak memuat ulang halaman. */
export async function aksiSimpanJawaban(proyekId: string, subBagianKode: string, isi: string) {
  return jalankanAksi(async (p) => (await simpanJawaban(p, { proyekId, subBagianKode, isi })).updatedAt.toISOString());
}

// ---------------------------------------------------------------- LKPS (F-08, F-09)

export async function aksiJadikanAktif(proyekId: string, berkasId: string) {
  const r = await jalankanAksi((p) => lkps.jadikanAktif(p, berkasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiBacaUlangLkps(proyekId: string, berkasId: string) {
  const r = await jalankanAksi((p) => lkps.bacaUlangLkps(p, berkasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}/lkps`);
  return r;
}

export async function aksiHapusLkps(proyekId: string, berkasId: string) {
  const r = await jalankanAksi((p) => lkps.hapusBerkasLkps(p, berkasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiSimpanKoreksi(proyekId: string, tabelId: string, baris: unknown, sudahDicek: boolean) {
  const r = await jalankanAksi((p) => lkps.simpanKoreksiTabel(p, tabelId, baris, sudahDicek).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

// ---------------------------------------------------------------- Dokumen (F-10, F-11, F-12)

export async function aksiUbahDokumen(proyekId: string, dokumenId: string, masukan: { judul?: string; tautanBukti?: string; dokumenDiharapkanId?: string | null }) {
  const r = await jalankanAksi((p) => dokumen.ubahDokumen(p, dokumenId, masukan).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiHapusDokumen(proyekId: string, dokumenId: string) {
  const r = await jalankanAksi((p) => dokumen.hapusDokumen(p, dokumenId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiProsesUlangDokumen(proyekId: string, dokumenId: string) {
  const r = await jalankanAksi((p) => dokumen.prosesUlangDokumen(p, dokumenId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiCariDokumen(proyekId: string, kueri: string, subBagianKode: string | null) {
  return jalankanAksi(async (p) => {
    const q = kueri.trim().slice(0, 500);
    if (q.length < 2) return { hasil: [], catatan: ["Ketik minimal 2 huruf."] };
    return pencarian.cariPotongan(p, proyekId, q, { subBagianKode });
  });
}

// ---------------------------------------------------------------- Mesin penyusun (F-13–F-21)

export async function aksiMulaiGenerate(proyekId: string, bagianKode: string, subBagianKode?: string | null) {
  const r = await jalankanAksi(async (p) => {
    const t = await generate.mulaiGenerate(p, proyekId, bagianKode, subBagianKode);
    return { id: t.id, status: t.status, pesan: t.pesan };
  });
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiBatalkanTugas(proyekId: string, tugasId: string) {
  const r = await jalankanAksi((p) => generate.batalkanTugas(p, tugasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiLanjutkanTugas(proyekId: string, tugasId: string) {
  const r = await jalankanAksi((p) => generate.lanjutkanTugas(p, tugasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

/** Simpan otomatis editor; tidak memuat ulang halaman. */
export async function aksiSimpanSuntingan(proyekId: string, subBagianKode: string, isi: unknown) {
  return jalankanAksi((p) => generate.simpanSuntingan(p, proyekId, subBagianKode, isi));
}

export async function aksiPulihkanVersi(proyekId: string, versiId: string) {
  const r = await jalankanAksi((p) => generate.pulihkanVersi(p, versiId));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiBandingkanVersi(versiLamaId: string, versiBaruId: string) {
  return jalankanAksi((p) => generate.bandingkanVersi(p, versiLamaId, versiBaruId));
}

export async function aksiTandaiSubBagian(proyekId: string, subBagianKode: string, selesai: boolean) {
  const r = await jalankanAksi((p) => generate.tandaiSubBagianSelesai(p, proyekId, subBagianKode, selesai));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiTandaiBagianSelesai(proyekId: string, bagianKode: string) {
  const r = await jalankanAksi((p) => generate.tandaiBagianSelesai(p, proyekId, bagianKode));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

// ---------------------------------------------------------------- Ekspor Word dan tim penyusun (F-22–F-24)

export async function aksiSimpanTim(proyekId: string, tim: MasukanTimPenyusun) {
  const r = await jalankanAksi((p) => ekspor.simpanTimPenyusun(p, proyekId, tim).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiMulaiEkspor(proyekId: string) {
  const r = await jalankanAksi(async (p) => (await ekspor.mulaiEkspor(p, proyekId)).id);
  revalidatePath(`/proyek/${proyekId}/ekspor`);
  return r;
}

export async function aksiHapusEkspor(proyekId: string, eksporId: string) {
  const r = await jalankanAksi((p) => ekspor.hapusEkspor(p, eksporId).then(() => null));
  revalidatePath(`/proyek/${proyekId}/ekspor`);
  return r;
}

// ---------------------------------------------------------------- Pengelolaan proyek

export async function aksiUbahNamaProyek(proyekId: string, nama: string) {
  const r = await jalankanAksi((p) => ubahNamaProyek(p, proyekId, nama).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}

export async function aksiArsipProyek(proyekId: string, arsip: boolean) {
  const r = await jalankanAksi((p) => aturArsipProyek(p, proyekId, arsip).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}

export async function aksiHapusProyek(proyekId: string, konfirmasiNama: string) {
  const r = await jalankanAksi((p) => hapusProyek(p, proyekId, konfirmasiNama).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}

/** Nilai hitung manual butir angka (revisi 19 Okt 2026); simpan otomatis tanpa memuat ulang halaman. */
export async function aksiSimpanNilaiManual(proyekId: string, butirKode: string, nilai: string, keterangan: string) {
  return jalankanAksi((p) => simpanNilaiManual(p, proyekId, { butirKode, nilai, keterangan }).then(() => null));
}

/** Batas pengajuan dan jadwal kerja mundur (revisi 22 Okt 2026). */
export async function aksiSimpanJadwal(proyekId: string, masukan: { batasPengajuan: string | null; jadwal: Record<string, string | null> }) {
  const r = await jalankanAksi((p) => simpanJadwal(p, proyekId, masukan as Parameters<typeof simpanJadwal>[2]).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}
