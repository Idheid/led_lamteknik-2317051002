/**
 * D9 (desain form 2, 2 Nov 2026): isi tabel identitas pengusul LED beserta asal datanya, dipakai bersama oleh ekspor
 * Word dan halaman "Halaman muka & identitas" supaya pratinjau sama dengan hasil ekspor.
 * Asal data menentukan siapa yang mengubahnya:
 * - institusi: Admin UPPS di Identitas institusi (berlaku semua prodi, juga untuk LKPS);
 * - admin: data utama prodi di Program studi (nama dan jenjang);
 * - riwayat: riwayat akreditasi (dicatat lewat Catat hasil akreditasi);
 * - prodi: Tim Prodi di Identitas prodi.
 */

export type AsalData = "institusi" | "admin" | "riwayat" | "prodi";

export const LABEL_ASAL: Record<AsalData, string> = {
  institusi: "Identitas institusi (Admin UPPS)",
  admin: "Program studi (Admin UPPS)",
  riwayat: "Riwayat akreditasi",
  prodi: "Identitas prodi",
};

export type KunciIdentitas =
  | "perguruanTinggi" | "upps" | "jenisProgram" | "namaProdi" | "alamat" | "telepon" | "emailWebsite"
  | "skPendirian" | "tanggalSkPendirian" | "pejabatSkPendirian" | "skPembukaan" | "tanggalSkPembukaan"
  | "pejabatSkPembukaan" | "tahunPertamaMenerima" | "peringkatAkreditasi" | "nomorSkAkreditasi";

export interface BarisIdentitas {
  kunci: KunciIdentitas;
  label: string;
  nilai: string;
  asal: AsalData;
}

export interface SumberIdentitas {
  fakultas: {
    nama: string; perguruanTinggi: string; alamat?: string | null; telepon?: string | null;
    skPendirian?: string | null; tanggalSkPendirian?: string | null; pejabatSkPendirian?: string | null;
  } | null;
  identitas: Record<string, string | null | undefined>;
  prodi: { nama: string; namaJenjang: string };
}

const isi = (v: string | null | undefined) => (v ?? "").trim();

/** Baris identitas pengusul sesuai urutan template LED; nilai kosong ditulis "" (ekspor menggantinya dengan "–"). */
export function barisIdentitas(s: SumberIdentitas): BarisIdentitas[] {
  const f = s.fakultas;
  const i = s.identitas;
  // institusi lebih dulu; identitas prodi lama (sebelum D7) sebagai cadangan
  const milikInstitusi = (kunci: "skPendirian" | "tanggalSkPendirian" | "pejabatSkPendirian"): [string, AsalData] =>
    isi(f?.[kunci]) ? [isi(f?.[kunci]), "institusi"] : [isi(i[kunci]), isi(i[kunci]) ? "prodi" : "institusi"];
  // prodi lebih dulu; institusi sebagai cadangan
  const milikProdi = (nilaiProdi: string, cadangan: string | null | undefined): [string, AsalData] =>
    nilaiProdi ? [nilaiProdi, "prodi"] : isi(cadangan) ? [isi(cadangan), "institusi"] : ["", "prodi"];
  const baris: [KunciIdentitas, string, [string, AsalData]][] = [
    ["perguruanTinggi", "Perguruan tinggi", [isi(f?.perguruanTinggi), "institusi"]],
    ["upps", "Unit Pengelola Program Studi (UPPS)", [isi(f?.nama), "institusi"]],
    ["jenisProgram", "Jenis program", [s.prodi.namaJenjang, "admin"]],
    ["namaProdi", "Nama program studi", [s.prodi.nama, "admin"]],
    ["alamat", "Alamat", milikProdi(isi(i.alamat), f?.alamat)],
    ["telepon", "Nomor telepon", milikProdi(isi(i.telepon), f?.telepon)],
    ["emailWebsite", "E-mail dan website", [[isi(i.email), isi(i.laman)].filter(Boolean).join(" / "), "prodi"]],
    ["skPendirian", "Nomor SK pendirian PT", milikInstitusi("skPendirian")],
    ["tanggalSkPendirian", "Tanggal SK pendirian PT", milikInstitusi("tanggalSkPendirian")],
    ["pejabatSkPendirian", "Pejabat penandatangan SK pendirian PT", milikInstitusi("pejabatSkPendirian")],
    ["skPembukaan", "Nomor SK pembukaan PS", [isi(i.skPembukaan), "prodi"]],
    ["tanggalSkPembukaan", "Tanggal SK pembukaan PS", [isi(i.tanggalSkPembukaan), "prodi"]],
    ["pejabatSkPembukaan", "Pejabat penandatangan SK pembukaan PS", [isi(i.pejabatSkPembukaan), "prodi"]],
    ["tahunPertamaMenerima", "Tahun pertama kali menerima mahasiswa", [isi(i.tahunPertamaMenerima), "prodi"]],
    ["peringkatAkreditasi", "Peringkat akreditasi terakhir", [isi(i.peringkatAkreditasi), "riwayat"]],
    ["nomorSkAkreditasi", "Nomor SK akreditasi terakhir", [isi(i.nomorSkAkreditasi), "riwayat"]],
  ];
  return baris.map(([kunci, label, [nilai, asal]]) => ({ kunci, label, nilai, asal }));
}

/** Nilai per kunci (untuk ekspor). */
export function nilaiIdentitas(s: SumberIdentitas): Record<KunciIdentitas, string> {
  return Object.fromEntries(barisIdentitas(s).map((b) => [b.kunci, b.nilai])) as Record<KunciIdentitas, string>;
}
