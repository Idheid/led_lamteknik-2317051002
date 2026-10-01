# Uji coba ekspor Word (spike, 2 Oktober 2026)

Tujuan: memastikan pustaka `docx` (fitur `patchDocument`, versi 9.7.1) bisa mengisi **Template LEDPS resmi** tanpa
merusak gaya template, sebelum iterasi 4 dibangun.

Langkah yang dicoba:
1. `sisipkan-placeholder.py` mengganti dua paragraf di template dengan `{{I-1}}` (Bab I) dan `{{C.1-IKU-a}}`
   (Kekhasan VMTS).
2. `patch-spike.mjs` menambal kedua placeholder dengan paragraf justify Arial 11 spasi 1,15, teks miring, tabel
   (baris judul diulang), dan gambar PNG dengan rasio dipertahankan, memakai `keepOriginalStyles: true`.
3. Hasil dikonversi ke PDF dengan LibreOffice (`soffice --headless --convert-to pdf`) untuk menghitung halaman (37).

Hasil (lihat `hasil-bab1.png` dan `hasil-c1-tabel-gambar.png`):
- Berhasil: header/footer dan logo template tetap, judul memakai gaya template, paragraf rata kiri-kanan, Arial,
  miring untuk istilah asing, tabel dengan baris judul, gambar utuh dengan judul di bawah.
- Temuan yang harus ditangani di iterasi 4:
  1. Setiap sub-bagian di template terdiri dari: judul, paragraf instruksi ("Bagian ini menjelaskan ..."),
     catatan biru miring ("(Penjelasan/Data dan analisis disampaikan ...)"), lalu **satu paragraf kosong berisi kotak
     teks** (bentuk `wps:wsp` dalam `wp:anchor`) sebagai area jawaban. Ada 60 kotak seperti itu.
     Penyiapan template harus menghapus instruksi, catatan, dan paragraf kotak, lalu menaruh satu placeholder `{{kode}}`.
     Pada spike, catatan biru Bab I dan kotak di C.1 masih tersisa karena belum dihapus.
  2. Pada sub-bagian bernomor I/II (misalnya C.2 3.a.i.I), paragraf instruksi adalah item daftar bernomor; label
     "I."/"II." harus dipertahankan (ganti teksnya saja, jangan hapus paragrafnya).
  3. Keputusan untuk pembimbing: narasi ditulis menggantikan kotak (usulan), atau ditulis di dalam kotak.
  4. Simpan template yang sudah diberi placeholder per versi instrumen (super admin mengunggah template baru bila
     LAM Teknik memperbarui template).
- Penomoran tabel/gambar (Tabel 2.3, Gambar 2.1) dibuat sistem; daftar isi otomatis belum diuji.

Menjalankan ulang (setelah `npm install docx`):
```
python docs/spike-ekspor/sisipkan-placeholder.py "<Template LEDPS>.docx" template_placeholder.docx
node docs/spike-ekspor/patch-spike.mjs     # butuh gambar.png dan template_placeholder.docx di folder kerja
soffice --headless --convert-to pdf hasil.docx
```
