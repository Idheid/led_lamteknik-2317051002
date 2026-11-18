// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/templates/kriteria-7-pkm.ts. Dipindah tanpa perubahan isi (Gabung LKPS G3).
import type { KriteriaTemplateDef } from "./types.ts";

export const kriteria7PkM: KriteriaTemplateDef = {
  nomorUrut: 7,
  kode: 'Kriteria 7',
  nama: 'Pengabdian kepada Masyarakat (PkM)',
  levelWewenang: 'PRODI',
  deskripsi: 'Aktivitas pengabdian kepada masyarakat dosen tetap yang secara nyata melibatkan mahasiswa prodi.',
  bobotNilai: 5.0,
  syaratPerlu: false,
  tabelList: [
    {
      nomorTabel: 'Tabel 7',
      sheetRef: '7',
      namaTabel: 'PkM DTPS yang Melibatkan Mahasiswa',
      levelPengisi: 'PRODI',
      wajibUploadBukti: true,
      targetJenjang: 'Semua Jenjang',
      konvensiWaktu: 'TS-2 s.d. TS (3 Tahun Terakhir)',
      deskripsi: 'Kegiatan pengabdian masyarakat dosen yang mengikutsertakan mahasiswa dalam implementasi teknologi/sosialisasi.',
      kolom: ['Nama Dosen Pengabdi', 'Judul Kegiatan PkM', 'Nama Mahasiswa Terlibat', 'Bentuk Partisipasi Mahasiswa', 'Mitra Sasaran'],
      dokumenBukti: 'Surat Tugas PkM Dekan, Dokumentasi Kegiatan Bersama Mahasiswa, & Laporan Akhir PkM.',
      rumusPenilaian: 'Persentase DTPS yang melibatkan mahasiswa dalam kegiatan PkM (min 25% untuk skor 4).',
    },
  ],
};
