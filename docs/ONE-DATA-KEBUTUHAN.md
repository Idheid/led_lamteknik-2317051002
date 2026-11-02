# Daftar kebutuhan data One Data Unila (draf untuk permintaan akses API)

Revisi 22 Oktober 2026, saran 4 dan 5. Sesuai arahan Pak Tris ("Tris 5" bagian 1), akses API diminta seperlunya:
hanya data di bawah, bukan seluruh daftar API. Dokumen ini disusun dari kolom template LKPS LAM Teknik 2025
(`src/modules/led/data-lkps/kolom-template.json`). Status: **menunggu persetujuan daftar dan akses API**. Selama itu unggah Excel LKPS
dan isian manual tetap dipakai.

Koordinasikan dengan Ghalib (sistem LKPS) supaya penarikan data, ID sinkron, dan persentase LKPS tidak dibuat dua kali.

## Prioritas 1: data dosen per prodi (dikerjakan pertama)

| Tabel LKPS | Data yang diminta dari One Data | Catatan |
|---|---|---|
| 4.a Profil Dosen | ID dosen (One Data), nama, NIDN/NIDK/NUPTK, homebase prodi (ID prodi One Data), status dosen tetap, pendidikan S1/S2/S3 (prodi dan bidang ilmu), bidang keahlian, jabatan akademik, nomor sertifikat pendidik | Sertifikat kompetensi/keinsinyuran, STRI, mata kuliah yang diampu, dan kesesuaiannya diisi prodi bila tidak ada di One Data |
| 4.c Beban Kerja Dosen Tetap | sks pendidikan per prodi, penelitian, PkM, tugas tambahan, per semester TS | Bila One Data hanya punya data mengajar, sisanya tetap diisi prodi |
| 4.b Tenaga Kependidikan | ID pegawai, nama, pendidikan terakhir, unit kerja | Hanya laboran, teknisi, administrator sistem |

## Prioritas 2: mahasiswa dan lulusan

| Tabel LKPS | Data yang diminta | Catatan |
|---|---|---|
| 6.a Jumlah Mahasiswa | jumlah mahasiswa aktif per prodi untuk TS-2, TS-1, TS; mahasiswa asing penuh/paruh waktu | Jumlah agregat saja, bukan data per mahasiswa |
| 6.b IPK Lulusan | per tahun lulus: jumlah lulusan, IPK minimum, rata-rata, maksimum | Agregat |
| 6.d Masa Studi Lulusan | per angkatan masuk: jumlah mahasiswa diterima dan jumlah lulus per tahun | Agregat |

## Prioritas 3: penelitian, PkM, publikasi (bila tersedia)

| Tabel LKPS | Data yang diminta |
|---|---|
| 3.b Penelitian DTPS, 3.c PkM DTPS | judul, ketua dan anggota (ID dosen), sumber dan jumlah dana, tahun |
| 4.d Publikasi Ilmiah DTPS | judul, penulis (ID dosen), jenis/tingkat publikasi, tahun |

## Data yang tidak diminta dan tidak disimpan

- **NIK** dan data kependudukan lain: tidak diminta, tidak disimpan.
- Data per mahasiswa (NIM, nama mahasiswa): tidak diminta; LKPS hanya butuh angka agregat.
- Alamat, kontak pribadi, dan data keuangan pegawai.

NIDN/NIDK/NUPTK yang memang wajib di Tabel 4.a tetap disamarkan otomatis sebelum konteks dikirim ke Gemini.

## Rancangan ID sinkron (belum dibuat di kode)

- Prodi mendapat kolom **ID sinkron**: ID prodi di One Data, diisi PJ di halaman prodi. ID lokal website tidak sama
  dengan ID One Data ("Tris 5" bagian 3).
- Setiap baris yang ditarik (dosen, tenaga kependidikan) menyimpan ID dari API. Penarikan berikutnya mencocokkan baris
  memakai ID itu, bukan nama atau ID lokal, sehingga perubahan nama atau urutan tidak membuat data ganda.
- Tombol **Sinkron One Data** di Pengaturan LED: dikerjakan worker (antrean baru), paling banyak sekali sehari per prodi;
  hasilnya mengisi tabel LKPS yang sama dengan unggah Excel, ditandai sumbernya "One Data" dan waktu sinkronnya.
- Kunci API One Data dikelola admin di halaman Kunci API, disimpan terenkripsi seperti kunci Gemini (AES-256-GCM),
  hanya 4 karakter terakhir yang ditampilkan.
- Uji: sinkron satu prodi, ID tersimpan, dan batas sekali sehari berjalan.

## Yang perlu dari pihak One Data

1. Dokumentasi endpoint untuk data di atas (format respons, paginasi, penanda tahun akademik/semester).
2. Cara autentikasi (kunci API atau token) dan batas permintaan.
3. Daftar ID prodi One Data untuk Fakultas Teknik.
4. Lingkungan uji (staging) bila ada.
