// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/templates/kriteria-6-penelitian.ts. Dipindah tanpa perubahan isi (Gabung LKPS G3).
import type { KriteriaTemplateDef } from "./types.ts";

export const kriteria6Penelitian: KriteriaTemplateDef = {
  nomorUrut: 6,
  kode: 'Kriteria 6',
  nama: 'Penelitian',
  levelWewenang: 'PRODI',
  deskripsi: 'Aktivitas penelitian dosen tetap yang secara aktif melibatkan mahasiswa dalam penyelesaian tugas akhir atau payung riset.',
  bobotNilai: 5.0,
  syaratPerlu: false,
  tabelList: [
    {
      nomorTabel: 'Tabel 6.a',
      sheetRef: '6a',
      namaTabel: 'Penelitian DTPS yang Melibatkan Mahasiswa',
      levelPengisi: 'PRODI',
      wajibUploadBukti: true,
      targetJenjang: 'Semua Jenjang',
      konvensiWaktu: 'TS-2 s.d. TS (3 Tahun Terakhir)',
      deskripsi: 'Judul penelitian dosen yang melibatkan mahasiswa sebagai asisten peneliti atau topik tugas akhir/skripsi.',
      kolom: ['Nama Dosen Peneliti', 'Judul Penelitian Sesuai Roadmap', 'Nama Mahasiswa Terlibat', 'Judul Tugas Akhir Beririsan'],
      dokumenBukti: 'SK Penugasan Asisten Peneliti, Kontrak Hibah, & Lembar Pengesahan TA Mahasiswa.',
      rumusPenilaian: 'Persentase DTPS yang melibatkan mahasiswa bimbingan dalam riset hibah (min 25% untuk skor 4).',
    },
    {
      nomorTabel: 'Tabel 6.b',
      sheetRef: '6b',
      namaTabel: 'Rujukan Tema Tesis / Disertasi Mahasiswa',
      levelPengisi: 'PRODI',
      wajibUploadBukti: true,
      targetJenjang: 'Magister (S2) & Doktor (S3)',
      konvensiWaktu: 'TS-2 s.d. TS (3 Tahun Terakhir)',
      deskripsi: 'Kesesuaian topik penelitian tesis/disertasi mahasiswa pascasarjana dengan agenda roadmap riset DTPS.',
      kolom: ['Nama Dosen Pengampu Riset', 'Judul Riset Payung', 'Nama Mahasiswa Pascasarjana', 'Judul Tesis / Disertasi'],
      dokumenBukti: 'Buku Dokumen Roadmap Riset Prodi & Lembar Pengesahan Tesis.',
      rumusPenilaian: 'Kesesuaian topik tesis dengan keahlian inti program pascasarjana.',
    },
  ],
};
