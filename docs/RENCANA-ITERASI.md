# Rencana iterasi prototyping

Empat iterasi. Kode F-xx sama dengan tabel Kebutuhan fungsional di dokumen rencana dan dipakai lagi di skenario uji
black-box.

**Keputusan Adrianne (2 Oktober 2026):** iterasi 3 dan 4 dilanjutkan tanpa menunggu umpan balik pembimbing per
iterasi. Review bersama pembimbing dan pemangku kepentingan dilakukan satu kali setelah website jadi (setelah
iterasi 4); umpan baliknya dicatat di `CATATAN-PENGEMBANGAN.md` dan dikerjakan sebagai perbaikan sebelum pengujian.
Iterasi 1 dan 2 sudah dikerjakan dengan aturan lama (demo per iterasi), tetapi belum didemokan.

Perbaikan sebelum iterasi 3 (permintaan Adrianne): menu Kunci API di halaman daftar proyek dan pengingat di Beranda;
pilihan model LLM dari daftar model Google (models.list) dengan uji model; pembuatan akun super admin lain, ganti kata
sandi sendiri (wajib saat login pertama), aturan minimal satu super admin aktif, data terikat ke prodi (bukan akun),
"satu akun per prodi" hanya menghitung akun aktif; petunjuk singkat di setiap halaman dan `docs/PANDUAN-PENGGUNAAN.md`.

Aturan kerja untuk Claude Code:
- Kerjakan satu iterasi sampai semua kriteria selesainya terpenuhi, lalu berhenti dan laporkan.
- Setiap fitur punya minimal satu uji (unit untuk logika domain, atau uji integrasi/aksi server untuk alur penting).
- `npm run lint`, `npm run typecheck`, dan `npm test` harus lulus sebelum iterasi dianggap selesai.

---

## Iterasi 1 — Fondasi dan instrumen dinamis

Kebutuhan: F-01 sampai F-07.

| Kode | Tugas |
| --- | --- |
| F-01 | Better Auth email + kata sandi; halaman login; dua peran (SUPER_ADMIN, PENANGGUNG_JAWAB); middleware proteksi rute; super admin membuat akun, menonaktifkan, mengatur ulang kata sandi; seed super admin dari `.env` |
| F-02 | Kelola UPPS dan prodi (nama, jenjang, kode PDDikti, identitas: SK pendirian, SK pembukaan, akreditasi terakhir); satu akun penanggung jawab per prodi |
| F-03 | Kelola versi instrumen: daftar versi, salin versi lama menjadi baru, aktif/nonaktif; versi yang dipakai proyek tidak bisa dihapus |
| F-04 | Kelola bagian dan sub-bagian: urutan, instruksi per varian jenjang, berlaku-untuk, tipe; halaman form kriteria dibuat dari data ini |
| F-05 | Kelola butir per jenjang: bobot, jenis, deskriptor skor 4, unsur skor 4, tabel LKPS, pertanyaan pemandu, dokumen pendukung, pemetaan ke sub-bagian |
| F-06 | Impor/seed instrumen dari `data/instrumen/lamteknik-2025-pasca.json` (idempoten) |
| F-07 | Proyek LED: prodi, jenjang, versi instrumen, tahun TS (usulan otomatis dari tanggal hari ini lewat `tsDariTanggalPengajuan`, bisa diubah; tampil peta TS sampai TS-7), salinan anggaran halaman |
| UI | Tata letak sidebar (shadcn Sidebar, bisa diciutkan, menu sesuai peran, lencana status per kriteria), halaman Beranda dengan progres dan anggaran halaman (`hitungAnggaran`), halaman kriteria C.1–C.7 yang menampilkan sub-bagian dan butir dari basis data (form isian jawaban penyusun boleh sudah bisa disimpan) |

Kriteria selesai:
- Super admin login, membuat UPPS, prodi, dan akun penanggung jawab; penanggung jawab login dan hanya melihat prodinya.
- Seed membuat 1 versi, 14 bagian, 125 sub-bagian, 72 butir Sarjana; total bobot 100,01; total halaman bawaan 150.
- Super admin menyalin versi instrumen lalu menambah satu butir; proyek lama tetap memakai versi lamanya.
- Penanggung jawab membuat proyek LED; sidebar menampilkan C.1–C.7 sesuai versi; halaman C.3 menampilkan 19 sub-bagian indikator
  kinerja yang berlaku untuk Sarjana beserta butirnya, ditambah 4 sub-bagian bersama (sub-bagian khusus Magister/Doktor/PPI tidak tampil).
- Beranda menampilkan anggaran: C.1 4 hlm, C.2 8, C.3 29, C.4 11, C.5 10, C.6 20, C.7 21 (sama dengan lembar kerja).
- Mockup/halaman nyata didemokan ke Pak Tris.

## Iterasi 2 — Unggah dan pemrosesan

Kebutuhan: F-08 sampai F-12.

| Kode | Tugas |
| --- | --- |
| F-08 | Unggah LKPS Excel (template LKPS LAM Teknik 2025, sheet `1`, `2a1`…`7b`); baca per sheet sesuai `tabelLkps` di seed; validasi sheet hilang atau sel kosong; simpan baris ke `TabelLKPS`; hitung metrik butir angka (NDTPS, PDTT, PDS3, PGBLKL, RBK, RI/RN/RW, dll.) di modul domain teruji |
| F-09 | Unggah LKPS PDF sebagai cadangan; tabel hasil ekstraksi ditandai `perluDicek` dan bisa dikoreksi manual |
| F-10 | Unggah dokumen pendukung per sub-bagian/butir (PDF, DOCX, gambar); daftar dokumen yang diharapkan tampil sebagai daftar cek; kolom tautan bukti sahih |
| F-11 | Worker: ekstraksi teks (unpdf, mammoth), pemotongan (± 800–1.200 karakter, tumpang tindih 15%), embedding (`embedMany`, 768 dimensi), status per berkas; proses ulang semua bila model embedding diganti |
| F-12 | Gambar disimpan utuh (berkas asli, tanpa kompresi ulang) dan bisa disisipkan ke narasi beserta judul gambar |

Kriteria selesai:
- Satu LKPS contoh terbaca benar (uji dengan berkas template yang diisi data fiktif; buat fiksturnya).
- Metrik butir angka dihitung sistem dan diuji terhadap contoh hitungan manual dari Matriks Penilaian.
- Dokumen PDF dan DOCX bisa dicari: pencarian gabungan vektor + kata kunci, disaring per proyek dan sub-bagian.
- Perlu kunci Gemini (penanggung jawab mengisinya lewat menu Kunci API sederhana; rotasi penuh di iterasi 3).

## Iterasi 3 — Mesin penyusun

Kebutuhan: F-13 sampai F-21.

| Kode | Tugas |
| --- | --- |
| F-13 | Generate per sub-bagian/butir, per kriteria (berurutan: IKU dulu, lalu latar belakang dan kebijakan, lalu analisis faktor, terakhir SWOT), dan per bagian di luar kriteria. Prompt dari `src/lib/domain/prompt.ts`; keluaran terstruktur sesuai `SKEMA_KELUARAN` |
| F-14 | Daftar cek unsur skor 4 per butir: terpenuhi, sebagian, belum ada bukti + dokumen yang perlu diunggah |
| F-15 | Penanda sumber per paragraf (tampil di aplikasi, tidak ikut ekspor) |
| F-16 | Editor Tiptap: tebal, miring, daftar, tabel, gambar; simpan otomatis |
| F-17 | Riwayat versi per sub-bagian: setiap generate dan suntingan jadi versi baru; bandingkan dua versi (diff); pulihkan |
| F-18 | Anggaran kata per sub-bagian dengan peringatan bila di luar rentang ±15% |
| F-19 | Kunci API: penanggung jawab mengisi kunci, menambah saat kuota habis; super admin menambah cadangan; urutan model cadangan; uji koneksi; rotasi lewat `src/lib/domain/kunci-api.ts`; tugas berhenti rapi dan lanjut otomatis setelah kunci baru diisi atau kuota direset |
| F-20 | Log pemakaian token per generate |
| F-21 | Status per sub-bagian dan kriteria (belum diisi, draf, disunting, selesai) dan progres |
| Cek | Pemeriksaan otomatis setelah generate: panjang (`statusPanjang`), angka (`angkaTidakBerdasar` terhadap metrik dan tabel), sumber (`periksaKeluaran`) |

Kriteria selesai:
- Satu kriteria lengkap disusun, disunting, diulang per butir, dibandingkan dengan versi lama, dan dipulihkan.
- Saat kunci dibuat gagal dengan 429 harian (tiruan), generate berhenti, pesan meminta kunci baru tampil, dan setelah
  kunci baru diisi generate lanjut dari butir yang tertunda.
- Narasi tidak memuat angka di luar data (diuji dengan konteks fiktif).

## Iterasi 4 — Ekspor dan bagian lain

Kebutuhan: F-22 sampai F-24.

| Kode | Tugas |
| --- | --- |
| Penyiapan template | Narasi MENGGANTIKAN kotak isian (keputusan 2 Okt 2026). Kembangkan `docs/spike-ekspor/siapkan-template.py` (sudah jalan untuk Bab I, II.B, C.1) menjadi modul TypeScript untuk 125 sub-bagian: hapus instruksi, catatan biru, kotak teks (60), dan paragraf kosong di bawah setiap judul, sisipkan `{{kode}}`, catat indentasi, pertahankan pemisah halaman dan penomoran I./II., hapus sub-bagian yang tidak berlaku untuk jenjang; simpan template siap-isi per versi |
| F-22 | Ekspor .docx ke template resmi untuk diunduh; hitung halaman dengan LibreOffice (`soffice --headless --convert-to pdf`); tahan ekspor bila > 150 halaman |
| F-23 | Halaman muka, identitas pengusul, identitas tim penyusun dari data proyek; kata pengantar dan ringkasan eksekutif disusun paling akhir |
| F-24 | Daftar isi, daftar tabel, daftar gambar otomatis (field TOC yang diperbarui saat dokumen dibuka) |
| Bab lain | Generate Bab I, II.A (dengan Tabel 2.1 dan 2.2), II.B, Bab III, Bab IV |

Kriteria selesai:
- Tidak ada instruksi template, catatan biru, atau kotak isian kosong yang tersisa di berkas hasil.
- Berkas Word utuh ≤ 150 halaman, paragraf justify, Arial 11, spasi 1,15, judul memakai gaya template, gambar sama
  dengan unggahan, tabel berjudul di atas dan bernomor per bab, gambar berjudul di bawah.
- Pemeriksaan sebelum ekspor menolak bila: ada bagian belum ditandai selesai, ada penanda `[BELUM ADA BUKTI:` tersisa,
  atau ada tabel/gambar tanpa judul.

## Setelah iterasi 4

Pengujian sesuai rencana uji (black-box F-01–F-24, retrieval, kualitas narasi oleh penilai ahli, SUS). Usulan fitur
tambahan U-01–U-09 menunggu keputusan Adrianne (lihat dokumen rencana).
