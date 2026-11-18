// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/templates/kriteria-9-penjaminan.ts. Dipindah tanpa perubahan isi (Gabung LKPS G3).
import type { KriteriaTemplateDef } from "./types.ts";

export const kriteria9SPMI: KriteriaTemplateDef = {
  nomorUrut: 9,
  kode: 'Kriteria 9',
  nama: 'Sistem Penjaminan Mutu Internal (SPMI)',
  levelWewenang: 'UPPS',
  deskripsi: 'Keterlaksanaan siklus PPEPP (Penetapan, Pelaksanaan, Evaluasi, Pengendalian, Peningkatan), Audit Mutu Internal (AMI), dan kelengkapan 4 Buku Dokumen SPMI.',
  bobotNilai: 5.0,
  syaratPerlu: true,
  tabelList: [
    {
      nomorTabel: 'Tabel 9.a',
      sheetRef: '9a',
      namaTabel: 'Evaluasi & Pengendalian Sistem Penjaminan Mutu (Siklus PPEPP)',
      levelPengisi: 'UPPS',
      wajibUploadBukti: true,
      targetJenjang: 'Semua Jenjang',
      konvensiWaktu: 'TS (Tahun Pelaporan Terkini)',
      deskripsi: 'Checklist keterlaksanaan siklus PPEPP pada seluruh standar mutu (Standar Pendidikan, Penelitian, PkM, dan Standar Tambahan).',
      kolom: ['Nama Standar Mutu Tridharma', 'Ketersediaan Dokumen Standar (P)', 'Pelaksanaan Standar (P)', 'Evaluasi & Audit (E)', 'Pengendalian Deviasi (P)', 'Peningkatan Standar (P)', 'Tanggal Siklus AMI Terakhir'],
      dokumenBukti: 'Laporan Laporan Audit Mutu Internal (AMI) Terakhir & Risalah Rapat Tinjauan Manajemen (RTM).',
      rumusPenilaian: 'Keterpenuhan siklus lengkap PPEPP secara berkala. Syarat Perlu Terakreditasi Baik Sekali & Unggul.',
    },
    {
      nomorTabel: 'Tabel 9.b',
      sheetRef: '9b',
      namaTabel: 'Ketersediaan Dokumen SPMI & SK Pengesahan',
      levelPengisi: 'UPPS',
      wajibUploadBukti: true,
      targetJenjang: 'Semua Jenjang',
      konvensiWaktu: 'Dokumen Aktif Berlaku',
      deskripsi: 'Kelengkapan 4 pilar buku SPMI: Kebijakan SPMI, Manual SPMI, Standar SPMI (SN-Dikti & Tambahan), serta Formulir / SOP SPMI.',
      kolom: ['Nama Buku Dokumen SPMI', 'Nomor SK Pengesahan', 'Tanggal Berlaku SK', 'Link File Bukti PDF'],
      dokumenBukti: 'Buku Dokumen SPMI lengkap yang disahkan Senat Fakultas / Pimpinan PT & SK Rektor.',
      rumusPenilaian: 'Ketersediaan dan keabsahan legal formal 4 Buku SPMI wajib Dikti.',
    },
  ],
};
