/**
 * Data FIKTIF untuk fikstur LKPS contoh (Program Sarjana "Teknik Contoh", TS 2025/2026).
 * Semua nama orang, lembaga, dan judul rekaan. Angka dirancang supaya mudah dihitung manual;
 * hitungan manualnya ada di docs/uji/hitungan-manual-lkps.md.
 *
 * `daftar`: baris tabel isian bebas, ditulis mulai baris data pertama setelah baris nomor kolom.
 * `berlabel`: baris berlabel tetap di template (dicari lewat teks label di kolom A atau B).
 */

export type Nilai = string | number | Date | null;
export type BarisIsi = Record<string, Nilai>;

export const TS_TAHUN_MULAI = 2025;
const t = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const V = 'V';

export const MENU: Record<string, Nilai> = {
  H7: 'Universitas Contoh',
  H9: 'Fakultas Teknik',
  H11: 'Sarjana',
  H23: 'Teknik Contoh',
  S73: t(2026, 8, 31),
};

// ------------------------------------------------------------------ Tabel 4.a: 15 dosen
// 12 DTPS (Dosen Tetap + V), 1 dosen tetap tidak sesuai kompetensi inti, 2 dosen tidak tetap.
// DTPS doktor: 5. Jabatan DTPS: 1 GB, 3 LK, 5 L, 3 AA.
const jabatanDtps = ['Guru Besar', 'Lektor Kepala', 'Lektor Kepala', 'Lektor Kepala', 'Lektor', 'Lektor', 'Lektor', 'Lektor', 'Lektor', 'Asisten Ahli', 'Asisten Ahli', 'Asisten Ahli'];
const dosen4a: BarisIsi[] = [
  ...jabatanDtps.map((jab, i) => ({
    B: `Dosen Contoh ${i + 1}`, C: `00${10 + i}0101`, D: 'Dosen Tetap', E: 'S1 Teknik Contoh', F: 'S2 Teknik Contoh',
    G: i < 5 ? 'S3 Teknik Contoh' : null, H: 'Rekayasa Contoh', J: V, K: jab, Q: `Mata Kuliah ${i + 1}`, R: V,
  })),
  { B: 'Dosen Contoh 13', C: '0099010101', D: 'Dosen Tetap', E: 'S1 Fisika', F: 'S2 Fisika', H: 'Fisika', K: 'Lektor', Q: 'Fisika Dasar' },
  { B: 'Dosen Tamu 1', C: '8800010101', D: 'Dosen Tidak Tetap', E: 'S1 Teknik Contoh', F: 'S2 Teknik Contoh', H: 'Rekayasa', K: 'Tenaga Pengajar', Q: 'Kapita Selekta' },
  { B: 'Dosen Tamu 2', C: '8800020202', D: 'Dosen Tidak Tetap', E: 'S1 Teknik Contoh', F: 'S2 Teknik Contoh', H: 'Rekayasa', K: 'Tenaga Pengajar', Q: 'Etika Profesi' },
];

// ------------------------------------------------------------------ Tabel 2.a: kerja sama
const ks = (mitra: string, tingkat: 'C' | 'D' | 'E', judul: string, mulai: Date, akhir: Date): BarisIsi => ({
  B: mitra, [tingkat]: V, F: judul, G: 'Peningkatan mutu tridharma', H: mulai, I: akhir, L: 'SPK dan laporan',
});
const ks2a1 = [
  ks('Universiti Contoh Malaysia', 'C', 'Pertukaran dosen tamu', t(2023, 1, 10), t(2027, 1, 10)),
  ks('PT Contoh Nasional', 'D', 'Magang industri', t(2022, 10, 1), t(2025, 10, 1)),
  ks('Pemerintah Kota Contoh', 'E', 'Kuliah lapangan', t(2024, 2, 1), t(2026, 2, 1)),
  ks('PT Lama Sekali', 'D', 'Kerja sama lama', t(2015, 1, 1), t(2019, 1, 1)), // tidak sah: di luar rentang
];
const ks2a2 = [
  ks('Contoh Institute of Technology', 'C', 'Riset material', t(2024, 3, 1), t(2027, 3, 1)),
  ks('BRIN Contoh', 'D', 'Riset energi', t(2023, 6, 1), t(2026, 6, 1)),
  ks('PT Riset Contoh', 'D', 'Riset proses', t(2025, 1, 1), t(2028, 1, 1)),
];
const ks2a3 = [
  ks('Dinas Contoh Provinsi', 'D', 'Pelatihan teknisi', t(2024, 4, 1), t(2026, 4, 1)),
  ks('Desa Contoh Makmur', 'E', 'Instalasi air bersih', t(2023, 8, 1), t(2025, 8, 1)),
  ks('UMKM Contoh Jaya', 'E', 'Pendampingan produksi', t(2025, 2, 1), t(2027, 2, 1)),
];

// ------------------------------------------------------------------ Tabel 3.a.1: 12 mata kuliah
// sks kuliah 100, seminar 4, praktik 40 → PJP = 40 / 144
const kuliah = [10, 10, 10, 10, 10, 10, 8, 8, 8, 8, 8];
const mk3a1: BarisIsi[] = [
  ...kuliah.map((sks, i) => ({ B: 1 + (i % 8), C: `TC${101 + i}`, D: `Mata Kuliah Contoh ${i + 1}`, E: i < 6 ? V : null, F: sks, G: 0, H: i < 10 ? 4 : 0, J: 'RPS', K: 'Prodi' })),
  { B: 7, C: 'TC200', D: 'Seminar Tugas Akhir', E: V, F: 0, G: 4, H: 0, J: 'RPS', K: 'Prodi' },
];

// ------------------------------------------------------------------ Tabel 4.c: beban kerja
const bk = (nama: string, dtps: boolean, d: number[]): BarisIsi => ({ B: nama, C: dtps ? V : null, D: d[0], E: d[1], F: d[2], G: d[3], H: d[4], I: d[5] });
const bk4c: BarisIsi[] = [
  ...Array.from({ length: 6 }, (_, i) => bk(`Dosen Contoh ${i + 1}`, true, [12, 2, 0, 6, 2, 6])), // 28 sks/tahun
  ...Array.from({ length: 4 }, (_, i) => bk(`Dosen Contoh ${i + 7}`, true, [14, 2, 0, 6, 4, 6])), // 32
  ...Array.from({ length: 2 }, (_, i) => bk(`Dosen Contoh ${i + 11}`, true, [14, 4, 2, 6, 4, 6])), // 36
  bk('Dosen Contoh 13', false, [12, 0, 0, 4, 2, 2]), // 20, bukan DTPS
];

export const DAFTAR: Record<string, BarisIsi[]> = {
  '2a1': ks2a1,
  '2a2': ks2a2,
  '2a3': ks2a3,
  '3a1': mk3a1,
  '3a3': [
    { B: 'Dosen Contoh 1', C: 'Riset material ramah lingkungan', D: 'Material Teknik', E: 'Studi kasus', H: V, I: 'Sesuai', J: 'Laporan Akhir', K: 'Sesuai' },
    { B: 'Dosen Contoh 2', C: 'Pemodelan energi desa', D: 'Sistem Energi', E: 'Bahan ajar', G: V, I: 'Sesuai', J: 'Publikasi', K: 'Sesuai' },
  ],
  '3a4': [
    { B: 'Kalkulus I', C: 1, D: 3 }, { B: 'Kalkulus II', C: 2, D: 3 }, { B: 'Fisika Dasar I', C: 1, D: 3 },
    { B: 'Fisika Dasar II', C: 2, D: 3 }, { B: 'Kimia Dasar', C: 1, D: 4 }, { B: 'Aljabar Linear', C: 3, D: 4 },
    { B: 'Statistika', C: 3, D: 3 }, { B: 'Metode Numerik', C: 4, D: 3 },
  ],
  '3a5': [{ B: 'Perancangan Teknik', C: 3, D: 'Capstone Design', E: 4, F: 7, G: 'Perancangan sistem lengkap' }],
  '4a': dosen4a,
  '4b': [
    { B: 'Teknisi Contoh 1', E: V, F: 'Teknik Contoh', K: 'K3 Laboratorium', L: 'Lab Proses' },
    { B: 'Laboran Contoh 2', G: V, F: 'Analis Kimia', K: 'Analis', L: 'Lab Material' },
  ],
  '4c': bk4c,
  '4f-1': [{ B: 'Alat pengering tenaga surya', C: t(2024, 5, 10), D: 'IDS000012345' }],
  '4f-2': [
    { B: 'Perangkat lunak simulasi proses', C: t(2023, 11, 2), D: 'EC00202301234' },
    { B: 'Modul praktikum digital', C: t(2024, 3, 15), D: 'EC00202402345' },
    { B: 'Desain alat uji tarik', C: t(2025, 2, 20), D: 'IDD000056789' },
    { B: 'Basis data material lokal', C: t(2026, 1, 12), D: 'EC00202600111' },
  ],
  '4f-3': [
    { B: 'Pompa air tenaga surya desa', C: t(2024, 7, 1), D: 'TKT 7', E: 'TKT-2024-01' },
    { B: 'Alat pemantau kualitas udara', C: t(2025, 9, 1), D: 'TKT 6', E: 'TKT-2025-07' },
  ],
  '4f-4': [
    { B: 'Buku Ajar Termodinamika', C: t(2023, 10, 1), D: '978-623-00-0001-1' },
    { B: 'Bab buku: Energi Terbarukan', C: t(2024, 8, 1), D: '978-623-00-0002-8' },
    { B: 'Buku Ajar Mekanika Fluida', C: t(2025, 12, 1), D: '978-623-00-0003-5' },
    { B: 'Buku lama di luar rentang', C: t(2019, 6, 1), D: '978-623-00-0000-4' },
  ],
  '4h': Array.from({ length: 12 }, (_, i): BarisIsi => {
    const pub = [[1, 0, 1], [0, 1, 1], [1, 1, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0], [0, 0, 2]][i];
    return pub
      ? { B: `Dosen Contoh ${i + 1}`, C: pub[0], D: pub[1], E: pub[2], F: 'Jurnal internasional bereputasi (Scopus)' }
      : { B: `Dosen Contoh ${i + 1}`, C: 0, D: 0, E: 0 };
  }),
  '4i': [
    { B: 'Dosen Contoh 1', C: 'Green material for rural housing', D: 12 },
    { B: 'Dosen Contoh 2', C: 'Village micro-grid planning', D: 5 },
    { B: 'Dosen Contoh 3', C: 'Process modelling of drying', D: 3 },
    { B: 'Dosen Contoh 7', C: 'Fluid flow in porous media', D: 1 },
    { B: 'Dosen Contoh 4', C: 'Belum disitasi', D: 0 },
  ],
  '4j': [
    { B: 'Dosen Contoh 1', C: 'Material', D: 'Keynote speaker seminar nasional', E: 'Surat undangan', G: V, I: 2024 },
    { B: 'Dosen Contoh 1', C: 'Material', D: 'Mitra bestari jurnal internasional', E: 'Sertifikat', H: V, I: 2025 },
    { B: 'Dosen Contoh 2', C: 'Energi', D: 'Tenaga ahli pemerintah provinsi', E: 'SK', F: V, I: 2025 },
    { B: 'Dosen Contoh 3', C: 'Proses', D: 'Editor jurnal terakreditasi', E: 'SK editor', G: V, I: 2024 },
    { B: 'Dosen Contoh 5', C: 'Fluida', D: 'Penghargaan dosen berprestasi', E: 'Piagam', G: V, I: 2025 },
    { B: 'Dosen Contoh 6', C: 'Termal', D: 'Penghargaan lama', E: 'Piagam', G: V, I: 2019 },
  ],
  '5a': [{ B: 'Laboratorium Proses', C: 1, D: 'Reaktor skala pilot', E: 2, F: 2, G: V, I: V, K: V }],
  '5b': [{ B: 'Prosedur K3 Laboratorium', C: 1, D: 'Disahkan Dekan 2024' }],
  '5c': [{ B: 'Alat pemadam api ringan', C: 'Pemadaman awal', D: 12, E: V }],
  '6a': [
    { B: 'Teknik Contoh', C: V, D: 300, E: 320, F: 350, G: 0, H: 1, I: 2, J: 0, K: 0, L: 1 },
    { B: 'Teknik Lain', D: 200, E: 210, F: 220, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0 },
  ],
  '6c1': [
    { B: 'Olimpiade sains internasional', C: t(2024, 10, 1), F: V, G: 'Medali perunggu' },
    ...['2022-11-01', '2023-05-01', '2024-03-01', '2025-04-01', '2025-11-01'].map((d, i) => ({ B: `Kompetisi nasional ${i + 1}`, C: d, E: V, G: 'Juara 2' })),
    ...['2022-02-01', '2023-09-01', '2024-06-01', '2025-07-01'].map((d, i) => ({ B: `Lomba wilayah ${i + 1}`, C: d, D: V, G: 'Juara 1' })),
    { B: 'Lomba lama', C: t(2019, 5, 1), E: V, G: 'Juara 3' },
  ],
  '6c2': [
    ...['2023-08-01', '2024-08-01', '2025-08-01'].map((d, i) => ({ B: `Kejuaraan olahraga nasional ${i + 1}`, C: d, E: V, G: 'Juara 3' })),
    ...['2022-01-10', '2022-12-10', '2023-12-10', '2024-12-10', '2025-03-10', '2026-03-10'].map((d, i) => ({ B: `Festival seni wilayah ${i + 1}`, C: d, D: V, G: 'Penampil terbaik' })),
  ],
  '6e3-2': [
    { B: 'Aplikasi pemantau tugas akhir', C: t(2024, 2, 1), D: 'EC00202400777' },
    { B: 'Desain kemasan produk desa', C: t(2025, 5, 1), D: 'IDD000077777' },
    { B: 'Modul pelatihan mahasiswa', C: t(2026, 2, 1), D: 'EC00202600888' },
  ],
  '6e3-3': [{ B: 'Prototipe sensor kelembapan', C: t(2025, 6, 1), D: 'TKT 5', E: 'TKT-2025-11' }],
  '6e3-4': [{ B: 'Bab buku mahasiswa: Inovasi Desa', C: t(2025, 10, 1), D: '978-623-00-0099-8' }],
  '6h1': [
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ B: `Dosen Contoh ${i}`, C: 'Material dan energi', D: `Mahasiswa ${i}`, E: `Penelitian bersama mahasiswa ${i}`, F: 2024 + (i % 3) })),
    { B: 'Dosen Contoh 1', C: 'Material dan energi', D: 'Mahasiswa 9', E: 'Penelitian bersama mahasiswa 1', F: 2024 },
    { B: 'Dosen Contoh 2', C: 'Material dan energi', D: 'Mahasiswa 10', E: 'Penelitian bersama mahasiswa 2', F: 2025 },
    { B: 'Dosen Contoh 9', C: 'Proses', D: 'Mahasiswa 11', E: 'Penelitian bersama mahasiswa 9', F: 2025 },
    { B: 'Dosen Contoh 10', C: 'Proses', D: 'Mahasiswa 12', E: 'Penelitian bersama mahasiswa 10', F: 2026 },
  ],
  '6i': [
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ B: `Dosen Contoh ${i}`, C: 'Teknologi tepat guna desa', D: `Mahasiswa PkM ${i}`, E: `PkM bersama mahasiswa ${i}`, F: 2024 + (i % 3) })),
    { B: 'Dosen Contoh 3', C: 'Teknologi tepat guna desa', D: 'Mahasiswa PkM 9', E: 'PkM bersama mahasiswa 3', F: 2025 },
  ],
  '1': [],
};

/** Baris berlabel: [sheet, kolom label, pola label, isi]. */
export const BERLABEL: [string, 'A' | 'B', RegExp, BarisIsi][] = [
  ['1', 'B', /^VMTS PT$/, { C: 'Menjadi universitas contoh yang unggul pada 2035', D: 'SK Rektor 1/2020', E: 'https://contoh.ac.id/vmts' }],
  ['1', 'B', /^VMTS UPPS$/, { C: 'Menjadi fakultas teknik contoh yang unggul', D: 'SK Dekan 2/2021', E: 'https://ft.contoh.ac.id/vmts' }],
  ['1', 'B', /^Visi Keilmuan PS$/, { C: 'Unggul dalam rekayasa ramah lingkungan', D: 'SK Dekan 3/2021', E: 'https://tc.contoh.ac.id/visi' }],
  // 2.b: kolom C-E UPPS, G-I Program Studi (Rupiah)
  ['2b', 'B', /^a\./, { C: 9_000_000_000, D: 9_500_000_000, E: 10_000_000_000, G: 900_000_000, H: 950_000_000, I: 1_000_000_000 }],
  ['2b', 'B', /^b\./, { C: 1_500_000_000, D: 1_500_000_000, E: 1_500_000_000, G: 150_000_000, H: 150_000_000, I: 150_000_000 }],
  ['2b', 'B', /^c\./, { C: 2_000_000_000, D: 2_500_000_000, E: 3_000_000_000, G: 200_000_000, H: 250_000_000, I: 300_000_000 }],
  ['2b', 'B', /^d\./, { C: 1_000_000_000, D: 1_000_000_000, E: 1_000_000_000, G: 100_000_000, H: 100_000_000, I: 100_000_000 }],
  ['2b', 'B', /^e\./, { C: 0, D: 0, E: 0, G: 0, H: 0, I: 0 }],
  ['2b', 'B', /^f\./, { C: 1_500_000_000, D: 1_500_000_000, E: 2_000_000_000, G: 150_000_000, H: 150_000_000, I: 200_000_000 }],
  ['2b', 'B', /^Biaya operasional kemahasiswaan/i, { C: 500_000_000, D: 500_000_000, E: 500_000_000, G: 50_000_000, H: 50_000_000, I: 50_000_000 }],
  ['2b', 'B', /^Biaya Penelitian/i, { C: 1_200_000_000, D: 1_500_000_000, E: 1_800_000_000, G: 120_000_000, H: 150_000_000, I: 180_000_000 }],
  ['2b', 'B', /^Biaya PkM/i, { C: 300_000_000, D: 360_000_000, E: 420_000_000, G: 30_000_000, H: 36_000_000, I: 42_000_000 }],
  // 3.b / 3.c: jumlah judul TS-2, TS-1, TS
  ['3b', 'B', /perguruan tinggi/i, { C: 6, D: 8, E: 10 }],
  ['3b', 'B', /dalam negeri/i, { C: 3, D: 4, E: 5 }],
  ['3b', 'B', /luar negeri/i, { C: 0, D: 1, E: 1 }],
  ['3c', 'B', /perguruan tinggi/i, { C: 8, D: 9, E: 10 }],
  ['3c', 'B', /dalam negeri/i, { C: 2, D: 2, E: 2 }],
  ['3c', 'B', /luar negeri/i, { C: 0, D: 0, E: 0 }],
  // 4.d: NA1..NB3
  ['4d', 'B', /^Jurnal nasional tidak terakreditasi/i, { C: 2, D: 2, E: 2 }],
  ['4d', 'B', /^Jurnal nasional terakreditasi/i, { C: 3, D: 4, E: 5 }],
  ['4d', 'B', /^Jurnal internasional$/i, { C: 1, D: 1, E: 2 }],
  ['4d', 'B', /^Jurnal internasional bereputasi/i, { C: 1, D: 2, E: 3 }],
  ['4d', 'B', /^Prosiding di seminar nasional/i, { C: 2, D: 2, E: 2 }],
  ['4d', 'B', /^Prosiding tidak terindeks/i, { C: 1, D: 0, E: 1 }],
  ['4d', 'B', /^Prosiding terindeks/i, { C: 2, D: 2, E: 2 }],
  // 6.b: lulusan dan IPK
  ['6b', 'B', /^TS-2$/, { C: 80, D: 2.75, E: 3.30, F: 3.90 }],
  ['6b', 'B', /^TS-1$/, { C: 90, D: 2.80, E: 3.35, F: 3.92 }],
  ['6b', 'B', /^TS$/, { C: 100, D: 2.85, E: 3.40, F: 3.95 }],
  // 6.d blok Sarjana: masuk (B), lulus 3,5<MS≤4,5 (C), 4,5–5,5 (D), 5,5–6,5 (E), 6,5–8 (F)
  ['6d', 'A', /^TS-7$/, { B: 100, C: 0, D: 0, E: 10, F: 5 }],
  ['6d', 'A', /^TS-6$/, { B: 100, C: 0, D: 20, E: 10, F: 0 }],
  ['6d', 'A', /^TS-5$/, { B: 100, C: 10, D: 30, E: 0, F: 0 }],
  ['6d', 'A', /^TS-4$/, { B: 100, C: 40, D: 20, E: 0, F: 0 }],
  ['6d', 'A', /^TS-3$/, { B: 100, C: 55, D: 0, E: 0, F: 0 }],
  ['6d', 'A', /^TS-2$/, { B: 100, C: 0, D: 0, E: 0, F: 0 }],
  ['6d', 'A', /^TS-1$/, { B: 110, C: 0, D: 0, E: 0, F: 0 }],
  ['6d', 'A', /^TS$/, { B: 120, C: 0, D: 0, E: 0, F: 0 }],
  // 6.e.1: publikasi mahasiswa NA1..NB3
  ['6e1', 'B', /^Jurnal nasional tidak terakreditasi/i, { C: 2, D: 2, E: 2 }],
  ['6e1', 'B', /^Jurnal nasional terakreditasi/i, { C: 1, D: 1, E: 2 }],
  ['6e1', 'B', /^Jurnal internasional$/i, { C: 0, D: 0, E: 1 }],
  ['6e1', 'B', /^Jurnal internasional bereputasi/i, { C: 0, D: 1, E: 0 }],
  ['6e1', 'B', /^Prosiding di seminar nasional/i, { C: 3, D: 3, E: 4 }],
  ['6e1', 'B', /^Prosiding tidak terindeks/i, { C: 0, D: 1, E: 0 }],
  ['6e1', 'B', /^Prosiding terindeks/i, { C: 1, D: 0, E: 1 }],
  // 6.f.1 blok Sarjana: lulusan, terlacak, WT<3, 3–18, >18
  ['6f1', 'A', /^TS-2$/, { B: 80, C: 40, D: 25, E: 12, F: 3 }],
  ['6f1', 'A', /^TS-1$/, { B: 90, C: 45, D: 30, E: 13, F: 2 }],
  // 6.f.2: lulusan, terlacak, rendah, sedang, tinggi
  ['6f2', 'A', /^TS-2$/, { B: 80, C: 40, D: 4, E: 16, F: 20 }],
  ['6f2', 'A', /^TS-1$/, { B: 90, C: 45, D: 5, E: 15, F: 25 }],
  // 6.g.1: lulusan, pengguna menanggapi, terlacak, lokal, nasional, internasional
  ['6g1', 'A', /^TS-2$/, { B: 80, C: 20, D: 40, E: 19, F: 16, G: 5 }],
  ['6g1', 'A', /^TS-1$/, { B: 90, C: 25, D: 45, E: 20, F: 20, G: 5 }],
  // 6.g.2: persentase sangat baik, baik, cukup, kurang
  ['6g2', 'B', /^Etika$/, { C: 60, D: 30, E: 10, F: 0, G: 'Pertahankan' }],
  ['6g2', 'B', /^Keahlian/, { C: 50, D: 40, E: 10, F: 0, G: 'Pertahankan' }],
  ['6g2', 'B', /^Kemampuan berbahasa asing/, { C: 20, D: 40, E: 30, F: 10, G: 'Kursus bahasa Inggris' }],
  ['6g2', 'B', /^Penggunaan teknologi informasi/, { C: 50, D: 40, E: 10, F: 0, G: 'Pertahankan' }],
  ['6g2', 'B', /^Kemampuan berkomunikasi/, { C: 40, D: 40, E: 20, F: 0, G: 'Pelatihan presentasi' }],
  ['6g2', 'B', /^Kerjasama tim/, { C: 60, D: 30, E: 10, F: 0, G: 'Pertahankan' }],
  ['6g2', 'B', /^Pengembangan diri/, { C: 40, D: 50, E: 10, F: 0, G: 'Mentoring karier' }],
  // 7.a / 7.b
  ['7a', 'B', /^Kebijakan SPMI/, { C: 'SPMI/KB/01', D: t(2023, 1, 5) }],
  ['7b', 'B', /^Penetapan$/, { C: 'https://contoh.ac.id/spmi/penetapan', E: 'https://contoh.ac.id/rtm', F: 'https://contoh.ac.id/peningkatan' }],
];
