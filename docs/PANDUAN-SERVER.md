# Panduan server, akses jaringan, dan cadangan

Revisi 22 Oktober 2026 (saran 11 dan 12). Website dijalankan dalam mode produksi di server (server fakultas atau
VPS) dengan Docker: aplikasi web, worker, PostgreSQL + pgvector, LibreOffice (hitung halaman), dan Caddy (HTTPS).
Worker juga membuat cadangan harian.

## 1. Menjalankan di server

Kebutuhan: Docker Engine + Docker Compose, port 80 dan 443 terbuka, dan (untuk HTTPS publik) nama domain yang
mengarah ke alamat IP server.

1. Salin kode proyek ke server (git clone atau salin folder, tanpa `node_modules`, `uploads`, dan `.env`).
2. Salin `.env.produksi.example` menjadi `.env.produksi`, lalu isi:
   - `POSTGRES_PASSWORD`: huruf dan angka saja.
   - `ALAMAT_SITUS` dan `BETTER_AUTH_URL`: alamat website (lihat contoh di berkas).
   - `BETTER_AUTH_SECRET` dan `ENCRYPTION_KEY`: buat dengan
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
     Bila data dipindah dari laptop, `ENCRYPTION_KEY` harus sama dengan di laptop.
   - `CADANGAN_FOLDER`: folder di disk lain atau drive fakultas yang dipasang di server.
3. Bangun dan nyalakan:

   ```
   docker compose -f docker-compose.produksi.yml --env-file .env.produksi up -d --build
   ```

   Layanan `migrasi` menerapkan migrasi basis data sekali, lalu `web` dan `worker` menyala.
4. Pertama kali saja, buat super admin dan instrumen bawaan:

   ```
   docker compose -f docker-compose.produksi.yml --env-file .env.produksi run --rm web npm run db:seed
   ```

5. Buka alamat website, login sebagai super admin, lalu buat akun PJ dan asesor.

Memperbarui ke versi kode baru: tarik kode terbaru, lalu jalankan lagi perintah langkah 3. Data di volume
`pgdata` dan `unggahan` tetap.

Melihat log: `docker compose -f docker-compose.produksi.yml logs -f web worker`.

Di Linux, folder cadangan harus bisa ditulis pengguna `node` di kontainer (uid 1000):
`sudo chown 1000:1000 /mnt/cadangan-led`.

### Basis data: PostgreSQL 17 + pgvector + pg_textsearch

Layanan `db` dibangun dari `docker/db/Dockerfile`: image `pgvector/pgvector:pg17` ditambah ekstensi BM25
`pg_textsearch` 1.5.1 (paket `.deb` rilis resmi Tiger Data, versi dan checksum SHA-256 dipatok untuk amd64 dan arm64)
dan `shared_preload_libraries = 'pg_textsearch'`. Perintah `up -d --build` di langkah 3 ikut membangunnya. Data di
volume `pgdata` tetap saat image diganti; cadangkan dulu (bagian 4) sebelum memperbarui versi ekstensi.

### OCR untuk PDF hasil pindai

Halaman PDF tanpa teks di Basis Pengetahuan dan PDF SK pada Catat hasil akreditasi dibaca dengan OCR lokal (tanpa AI,
data tidak keluar server). Semua kebutuhannya terpasang lewat `npm install`:

- `tesseract.js` (WebAssembly, tanpa pustaka sistem);
- data bahasa Indonesia dan Inggris dari paket `@tesseract.js-data/ind` dan `@tesseract.js-data/eng` (model
  `best_int`). Saat OCR pertama kali berjalan, berkasnya disalin ke folder sementara sistem
  (`OCR_TESSDATA_DIR` untuk folder lain); tidak ada unduhan dari internet saat aplikasi berjalan;
- `@napi-rs/canvas` untuk merender halaman PDF (biner Linux amd64/arm64 ikut terpasang). Bila biner ini tidak bisa
  dimuat (misalnya diblokir kebijakan keamanan Windows), OCR memakai gambar pindaian yang tertanam di halaman PDF.

OCR berjalan di `worker`. Satu halaman A4 butuh sekitar 1–5 detik dan ± 300 MB memori selama pekerja OCR aktif; pekerja
ditutup otomatis setelah 15 detik menganggur (`OCR_JEDA_TUTUP_MS`). LKPS tidak di-OCR.

## 2. HTTPS dan alamat login

- Domain publik (`ALAMAT_SITUS="led.ft.unila.ac.id"`): Caddy mengambil sertifikat Let's Encrypt otomatis.
- Alamat IP dengan HTTPS (`ALAMAT_SITUS="https://192.168.1.10"`): Caddy memakai CA internalnya; browser memberi
  peringatan sertifikat sekali per perangkat.
- `BETTER_AUTH_URL` harus sama persis dengan alamat yang dibuka pengguna (termasuk `https://`). Bila website
  juga dibuka lewat alamat lain, tambahkan ke `BETTER_AUTH_TRUSTED_ORIGINS` (dipisah koma). Bila alamat tidak
  cocok, login ditolak.

## 3. Uji awal di jaringan lokal (laptop sebagai server)

Untuk uji dengan asesor sebelum server tersedia, laptop dan perangkat asesor tersambung ke jaringan (Wi-Fi) yang sama.

1. Cari alamat IP laptop: jalankan `ipconfig`, lihat "IPv4 Address" (mis. `192.168.1.10`).
2. Pilih salah satu:
   - Docker produksi (disarankan): di `.env.produksi` isi `ALAMAT_SITUS="http://192.168.1.10"` dan
     `BETTER_AUTH_URL="http://192.168.1.10"`, lalu jalankan langkah 1.3. Website dibuka di `http://192.168.1.10`.
   - Tanpa Docker untuk web: di `.env` isi `BETTER_AUTH_URL="http://192.168.1.10:3000"`, lalu
     `npm run build`, `npm start`, dan `npm run worker` di terminal lain. Website dibuka di
     `http://192.168.1.10:3000`, juga dari laptop sendiri (bukan `localhost`).
3. Windows Firewall: izinkan port masuk 80 (Docker) atau 3000 (tanpa Docker) untuk jaringan Private. Pengaturan
   ini dilakukan pemilik laptop sendiri (Windows Security → Firewall → Advanced settings → Inbound Rules).
4. Alamat IP laptop bisa berubah setelah tersambung ulang; bila berubah, perbarui kedua alamat di atas.

Mode pengembangan (`npm run dev`) dari perangkat lain butuh `ALLOWED_DEV_ORIGINS="192.168.1.10"`; untuk uji
dengan asesor pakai mode produksi.

## 4. Cadangan harian

Worker membuat cadangan setiap hari pukul 02.00 WIB (`CADANGAN_JADWAL`, format cron). Bila server atau laptop mati
pada jam itu, cadangan dibuat sekali saat worker menyala lagi. Isi satu cadangan, di folder
`cadangan-YYYYMMDD-HHMMSS`:

| Berkas | Isi |
|---|---|
| `basis-data.dump` | seluruh basis data (`pg_dump` format custom, termasuk antrean dan potongan dokumen) |
| `unggahan.zip` | folder unggahan: LKPS, dokumen, template, hasil ekspor |
| `info.json` | waktu, migrasi terakhir, jumlah berkas |

Hanya `CADANGAN_SIMPAN` (bawaan 14) cadangan terbaru yang disimpan. Cadangan ditulis ke folder sementara lalu
diganti nama, jadi cadangan yang gagal tidak meninggalkan folder setengah jadi.

Admin melihat status cadangan terakhir (tanggal, berhasil atau gagal, ukuran) di halaman Akun PJ. Kotak status
berwarna kuning bila cadangan berhasil terakhir lebih dari dua hari lalu.

Cadangan manual: `npm run cadangan` (di server Docker:
`docker compose -f docker-compose.produksi.yml --env-file .env.produksi exec worker npm run cadangan`).
Daftar cadangan: `npm run cadangan -- daftar`.

Di laptop pengembangan, `pg_dump` 17 dipakai dari kontainer basis data (sudah diatur di `.env.example`):
`CADANGAN_PG_DUMP="docker exec -i -e PGPASSWORD led-lamteknik-db pg_dump"`.

## 5. Memulihkan dari cadangan

Pemulihan menimpa isi basis data tujuan. Selalu uji dulu ke basis data terpisah.

1. Uji pemulihan ke basis data terpisah (aman, data asli tidak tersentuh):

   ```
   npm run cadangan -- pulihkan cadangan-20261022-020000 --db "postgresql://led:SANDI@localhost:5432/led_lamteknik_pulih" --unggahan ./pulih-unggahan
   ```

   Basis data `led_lamteknik_pulih` dibuat bila belum ada. Periksa isinya, misalnya dengan menjalankan website
   memakai `DATABASE_URL` dan `UPLOAD_DIR` itu.
2. Pemulihan sungguhan:
   1. Hentikan web dan worker: `docker compose -f docker-compose.produksi.yml --env-file .env.produksi stop web worker`.
   2. Pulihkan ke basis data utama dan folder unggahan utama:

      ```
      docker compose -f docker-compose.produksi.yml --env-file .env.produksi run --rm worker sh -c 'npm run cadangan -- pulihkan cadangan-20261022-020000 --db "$DATABASE_URL" --unggahan /data/unggahan'
      ```

   3. Nyalakan lagi dengan perintah langkah 1.3; migrasi yang lebih baru dari cadangan diterapkan otomatis.
3. `ENCRYPTION_KEY` harus sama dengan saat cadangan dibuat, supaya kunci API yang tersimpan bisa dibuka.

Memindahkan data dari laptop ke server memakai cara yang sama: buat cadangan di laptop (`npm run cadangan`), salin
foldernya ke folder cadangan server, lalu pulihkan seperti langkah 2.

## 6. Gemini tier berbayar untuk data asli

**Mengapa.** Pada layanan gratis (*free tier*), Google boleh memakai isi permintaan untuk meningkatkan produknya; pada
tier berbayar tidak. Sistem menyamarkan NIDN/NIP/NIM dan nama mahasiswa sebelum dikirim, tetapi dokumen mutu prodi tetap
dikirim sebagai potongan teks. Untuk LED asli, pakai kunci dari project Google yang penagihannya aktif.

Fakta yang dicek 6 November 2026 (bisa berubah; lihat halaman resmi Google sebelum memutuskan):

- batas kuota (permintaan per menit, token per menit, permintaan per hari) dihitung **per project Google**, bukan per
  kunci API; menambah kunci dari project yang sama tidak menambah kuota;
- kuota harian direset tengah malam waktu Pasifik (± 15.00 WIB saat PST, ± 14.00 WIB saat PDT); dialog Susun seluruh LED
  menampilkan jam reset berikutnya;
- angka batas free tier hanya tampil di Google AI Studio.

**Menautkan penagihan (Tier 1).**

1. Buka aistudio.google.com → *Get API key* → pilih project yang dipakai kunci LED.
2. Pilih *Set up billing* / *Upgrade*, lalu tautkan akun penagihan Google Cloud (kartu atau rekening institusi).
3. Di Google Cloud Console → *Billing* → *Budgets & alerts*, buat anggaran dengan batas tagihan, misalnya $250, dan
   pemberitahuan pada 50%, 90%, dan 100%.
4. Di aplikasi, buka Kunci API, isi kolom **Proyek Google** dengan nama project tersebut, lalu **Uji koneksi**.

**Memperkirakan biaya dari `LogPemakaian`.** Setiap panggilan mencatat model, token masukan, token keluaran (termasuk
*thinking*), dan token dari *cache*. Contoh untuk bulan berjalan:

```sql
SELECT "model", count(*) AS panggilan, sum("tokenMasuk") AS masuk, sum("tokenKeluar") AS keluar, sum("tokenCache") AS cache
FROM "LogPemakaian"
WHERE "berhasil" AND "createdAt" >= date_trunc('month', now())
GROUP BY "model";
```

Biaya ≈ (masuk ÷ 1.000.000 × harga masukan) + (keluar ÷ 1.000.000 × harga keluaran). Harga `gemini-3.8-flash` per
1 juta token menurut halaman harga Google pada 6 November 2026 (bukan harga tetap):

| | Sampai 31 Des 2026 | Mulai 1 Jan 2027 |
|---|---|---|
| Masukan | $0,75 | $1,50 |
| Keluaran (termasuk *thinking*) | $3,75 | $7,50 |

**Belum dikerjakan (kemungkinan):** mode *Batch API* untuk menyusun semalam (harga ± separuh, hasil tidak langsung
tampil). Perlu persetujuan sebelum dibuat.

## 7. Sinkron One Data (myUnila) di modul LKPS

Sinkron One Data di halaman **LKPS → Impor One Data** mati secara bawaan (Gabung LKPS G6). Tombol "Tarik Data Terbaru
Prodi" nonaktif dengan keterangan "Sinkron One Data belum diaktifkan", dan `POST /api/lkps/onedata/sinkron` membalas
503. Impor berkas (xlsx/csv/json) tetap bisa dipakai.

Untuk menyalakannya, isi variabel berikut di `.env` (atau `.env.produksi`), lalu mulai ulang web:

| Variabel | Isi |
|---|---|
| `LKPS_ONEDATA_AKTIF` | `true` untuk menyalakan; selain itu mati |
| `MYUNILA_API_URL` | alamat dasar WS API myUnila (tanpa garis miring di akhir) |
| `MYUNILA_APP_ID` | ID Aplikasi yang terdaftar di myUnila |
| `MYUNILA_USERNAME` | akun penanggung jawab aplikasi |
| `MYUNILA_PASSWORD` | kata sandi akun itu |

Bila salah satu kosong, sinkron tetap mati. Tidak ada nilai bawaan di kode. Nilai variabel tidak boleh ditulis di
dokumen, di-commit, atau dicetak di log. Token login hanya disimpan di memori server, dicek ulang lewat
`/v1/auth/check-token`, dan tidak pernah dikirim ke browser. Kredensial siapa yang dipakai (aplikasi Adrianne atau
Ghalib) belum diputuskan.

