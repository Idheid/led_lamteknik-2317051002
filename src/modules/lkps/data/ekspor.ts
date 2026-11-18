import { existsSync } from "node:fs";
import ExcelJS from "exceljs";
import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanEksporProdiLkps } from "@/modules/lkps/data/akses";

import { alamatBukti } from "@/modules/lkps/domain/bukti";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/export/route.ts.
// Gabung LKPS G4: `xlsx` diganti `exceljs` (masalah 7); jalur templat dari `LKPS_TEMPLAT_EKSPOR` di .env (kode asal:
// jalur tetap di laptop pengembang, masalah 6), bila kosong/tidak ada → workbook baru seperti cadangan kode asal.
// Struktur sheet, judul kolom, dan baris awal sama dengan kode asal; datanya kini hanya prodi aktif (kode asal: semua
// prodi tanpa saringan).

type Nilai = string | number | null;

/**
 * Setara pola kode asal: bila sheet ada di templat, tulis baris data mulai `barisAwal` (sheet_add_aoa origin A<n>);
 * bila tidak ada, buat sheet baru berisi judul + data (aoa_to_sheet).
 */
function isiSheet(wb: ExcelJS.Workbook, nama: string, judul: string[], data: Nilai[][], barisAwal: number): void {
  const ws = wb.getWorksheet(nama);
  if (!ws) {
    const baru = wb.addWorksheet(nama);
    baru.addRow(judul);
    for (const b of data) baru.addRow(b);
    return;
  }
  data.forEach((b, i) => {
    const row = ws.getRow(barisAwal + i);
    b.forEach((v, k) => {
      row.getCell(k + 1).value = v;
    });
    row.commit();
  });
}

const tgl = (d: Date) => d.toISOString().slice(0, 10);

export function jalurTemplatEkspor(): string | null {
  const j = process.env.LKPS_TEMPLAT_EKSPOR?.trim();
  return j && existsSync(j) ? j : null;
}

/** GET `/api/lkps/ekspor` → berkas .xlsx LKPS prodi aktif. */
export async function eksporLkps(p: Pengguna, prodiId: string): Promise<{ nama: string; isi: Buffer }> {
  await pastikanEksporProdiLkps(p, prodiId);
  const where = { prodiId };
  const wb = new ExcelJS.Workbook();
  const templat = jalurTemplatEkspor();
  if (templat) await wb.xlsx.readFile(templat);

  // 1. Tabel 1-1 (Kerjasama)
  const kerjasama = await prisma.lkpsKerjasama.findMany({ where, orderBy: { createdAt: "asc" } });
  isiSheet(wb, "1-1", ["No.", "Lembaga Mitra", "Tingkat", "Judul Kegiatan", "Manfaat", "Waktu & Durasi", "Bukti"],
    kerjasama.map((k, i) => [i + 1, k.namaLembaga, k.tingkat, k.judulKegiatan, k.manfaat, `${tgl(k.tanggalMulai)} s/d ${tgl(k.tanggalAkhir)}`, k.berkasNama ?? alamatBukti(k.berkasLokasi) ?? "-"]), 8);

  // 2. Tabel 2a1 (Seleksi & Jumlah Mahasiswa)
  const mhs = await prisma.lkpsSeleksiMahasiswaBaru.findMany({ where, orderBy: { createdAt: "asc" } });
  isiSheet(wb, "2a1", ["Tahun Semester", "Daya Tampung", "Pendaftar", "Lulus", "Baru Reguler", "Baru Transfer", "Aktif Reguler", "Aktif Transfer"],
    mhs.map((m) => [m.tahunSemester, m.dayaTampung, m.jumlahPendaftar, m.jumlahLulusSeleksi, m.mahasiswaBaruReguler, m.mahasiswaBaruTransfer, m.mahasiswaAktifReguler, m.mahasiswaAktifTransfer]), 6);

  // 3. Tabel 3a1 (DTPS, 13 kolom baku)
  const dosen = await prisma.lkpsDosenTetap.findMany({ where });
  isiSheet(wb, "3a1",
    ["No.", "Nama Dosen", "NIDN / NIDK", "Magister (S2)", "Doktor (S3)", "Bidang Keahlian", "Kesesuaian Kompetensi Inti", "Jabatan Akademik",
      "No. Sertifikat Pendidik", "Bidang Sertifikasi", "Lembaga Penerbit", "Mata Kuliah Diampu PS Akreditasi", "Kesesuaian dg MK", "Mata Kuliah Diampu PS Lain"],
    dosen.map((d, i) => [
      i + 1, d.nama, d.nidn || "-",
      d.prodiPascaS2 || (d.pendidikanS2 ? "Magister (S2)" : "-"),
      d.prodiPascaS3 || (d.pendidikanS3 ? "Doktor (S3)" : "-"),
      d.bidangKeahlian || "-",
      (d.kesesuaianKompetensi ?? true) ? "V" : "-",
      d.jabatanAkademik,
      d.noSertifikatPendidik || (d.sertifikasiDosen ? "V" : "-"),
      d.bidangSertifikasi || (d.sertifikasiKompetensi ? "V" : "-"),
      d.lembagaSertifikasi || "-",
      d.mataKuliahDiampu || "-",
      d.kesesuaianBidang ? "V" : "-",
      d.mataKuliahPSLain || "-",
    ]), 8);

  // 3.b Kinerja & luaran dosen
  const luaranDosen = await prisma.lkpsLuaranDosen.findMany({ where, include: { dosen: true } });
  const nmDosen = (l: (typeof luaranDosen)[number]) => l.namaDosen || l.dosen?.nama || "-";
  const rekognisi = luaranDosen.filter((l) => l.jenis.includes("Rekognisi") || l.jenis.includes("Staf Ahli") || l.jenis.includes("Visiting"));
  isiSheet(wb, "3b1", ["No.", "Nama Dosen", "Bidang Keahlian", "Rekognisi / Bukti", "Tingkat", "Tahun"],
    rekognisi.map((r, i) => [i + 1, nmDosen(r), r.dosen?.bidangKeahlian || "-", r.judul, r.detail || "-", r.tahun]), 8);
  const sitasi = luaranDosen.filter((l) => l.jenis.includes("Sitasi"));
  isiSheet(wb, "3b6", ["No.", "Nama Dosen", "Judul Artikel yang Disitasi", "Nama Jurnal / Jumlah Sitasi"],
    sitasi.map((s, i) => [i + 1, nmDosen(s), s.judul, s.detail || "-"]), 6);
  const produk = luaranDosen.filter((l) => l.jenis.includes("Produk") || l.jenis.includes("Jasa"));
  isiSheet(wb, "3b7", ["No.", "Nama Dosen", "Nama Produk/Jasa", "Deskripsi & Bukti Pengadopsi", "Tahun"],
    produk.map((x, i) => [i + 1, nmDosen(x), x.judul, x.detail || "-", x.tahun]), 6);
  const hki = luaranDosen.filter((l) => l.jenis.includes("HKI") || l.jenis.includes("Paten") || l.jenis.includes("Hak Cipta") || l.jenis.includes("Buku"));
  isiSheet(wb, "3b8-1", ["No.", "Nama Dosen", "Judul Paten / HKI", "Nomor Paten / Keterangan", "Tahun"],
    hki.map((h, i) => [i + 1, nmDosen(h), h.judul, h.detail || "-", h.tahun]), 7);

  // 4. Keuangan (4a) dan laboratorium (4b)
  const dana = await prisma.lkpsPenggunaanDana.findMany({ where, orderBy: { tahunSemester: "asc" } });
  isiSheet(wb, "4a", ["Tahun Semester", "Operasional Pendidikan", "Penelitian Dosen", "PkM Dosen", "Investasi SDM", "Investasi Sarana", "Investasi Prasarana"],
    dana.map((d) => [d.tahunSemester, d.biayaOperasionalPendidikan, d.biayaPenelitianDosen, d.biayaPkmDosen, d.investasiSdm, d.investasiSarana, d.investasiPrasarana]), 7);
  const lab = await prisma.lkpsLaboratorium.findMany({ where, orderBy: { namaLab: "asc" } });
  isiSheet(wb, "4b", ["No.", "Nama Laboratorium", "Peralatan Utama", "Kepemilikan", "Kondisi", "Jam Penggunaan", "Luas Ruangan (m2)"],
    lab.map((l, i) => [i + 1, l.namaLab, l.jenisPeralatan, l.kepemilikan, l.kondisi, l.jamPenggunaan, l.luasRuangan]), 7);

  // 5. Kurikulum (5a-1) dan MBKM (5b-1)
  const mk = await prisma.lkpsMataKuliah.findMany({ where, orderBy: { kode: "asc" } });
  isiSheet(wb, "5a-1", ["Kode MK", "Nama Mata Kuliah", "SKS Teori", "SKS Praktikum", "CPL yang Dipetakan", "Unit Penyelenggara"],
    mk.map((m) => [m.kode, m.nama, m.sksTeori, m.sksPraktikum, m.cpl, m.unitPenyelenggara || "-"]), 7);
  const mbkm = await prisma.lkpsProgramMbkm.findMany({ where, orderBy: { namaMahasiswa: "asc" } });
  isiSheet(wb, "5b-1", ["No.", "Nama Mahasiswa", "NIM", "Nama Mitra", "SKS Konversi", "Dosen Pembimbing", "Tahun"],
    mbkm.map((b, i) => [i + 1, b.namaMahasiswa, b.nim, b.namaMitra, b.sksKonversi, b.dosenPembimbing, b.tahun]), 7);

  // 6. Penelitian (6a) dan PkM (7)
  const penelitian = await prisma.lkpsPenelitianDosen.findMany({ where: { ...where, jenis: "Penelitian" }, orderBy: { tahun: "desc" } });
  isiSheet(wb, "6a", ["No.", "Nama Dosen", "Judul Penelitian", "Mahasiswa Terlibat", "Tahun"],
    penelitian.map((x, i) => [i + 1, x.namaDosen, x.judul, x.mahasiswaTerlibat, x.tahun]), 7);
  const pkm = await prisma.lkpsPenelitianDosen.findMany({ where: { ...where, jenis: "PkM" }, orderBy: { tahun: "desc" } });
  isiSheet(wb, "7", ["No.", "Nama Dosen", "Judul PkM", "Mahasiswa Terlibat", "Tahun"],
    pkm.map((x, i) => [i + 1, x.namaDosen, x.judul, x.mahasiswaTerlibat, x.tahun]), 7);

  // 7. Luaran (8a IPK, 8b1 prestasi)
  const ipk = await prisma.lkpsIpkLulusan.findMany({ where, orderBy: { tahunSemester: "asc" } });
  isiSheet(wb, "8a", ["Tahun Semester", "IPK Minimum", "IPK Rata-Rata", "IPK Maksimum"],
    ipk.map((x) => [x.tahunSemester, x.ipkMinimum, x.ipkRataRata, x.ipkMaksimum]), 7);
  const prestasi = await prisma.lkpsPrestasiMahasiswa.findMany({ where, orderBy: { tahun: "desc" } });
  isiSheet(wb, "8b1", ["No.", "Nama Mahasiswa", "Nama Kegiatan", "Tingkat", "Penghargaan", "Tahun", "Jenis"],
    prestasi.map((x, i) => [i + 1, x.namaMahasiswa, x.namaKegiatan, x.tingkat, x.penghargaan, x.tahun, x.jenis]), 7);

  // 8. SPMI (9a)
  const spmi = await prisma.lkpsDokumenSpmi.findMany({ where, orderBy: { jenisDokumen: "asc" } });
  isiSheet(wb, "9a", ["No.", "Jenis Dokumen", "Status Ketersediaan", "Keterangan"],
    spmi.map((s, i) => [i + 1, s.jenisDokumen, s.tersedia ? "Tersedia" : "Belum Ada", s.keterangan || "-"]), 7);

  const isi = Buffer.from(await wb.xlsx.writeBuffer());
  return { nama: `LKPS_LAM_Teknik_${new Date().toISOString().slice(0, 10)}.xlsx`, isi };
}
