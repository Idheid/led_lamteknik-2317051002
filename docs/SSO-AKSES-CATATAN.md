# Catatan API Manajemen Akses (SSO Unila) untuk website Akreditasi LAM Teknik

Isi dari dokumentasi `https://akses.unila.ac.id/api/live/v1` bagian `auth/login/sso` dan video "walkthrough test".
**Jangan tulis `app_key`, ID Aplikasi, password, atau token di berkas ini.** Nilai rahasia hanya di `.env`.

Dipakai oleh `docs/RENCANA-18NOV.md` tahap S5. Claude Code tidak boleh menebak isian yang masih kosong.

## 1. Memulai login

- URL: `https://akses.unila.ac.id/api/live/v1/auth/login/sso`
- Metode: (GET/POST?)
- Parameter: `app_key` = … (dari `.env` `SSO_APP_KEY`)
- Parameter lain (alamat kembali, state)? …

## 2. Alamat kembali (callback)

- Bagaimana alamat kembali didaftarkan (di Manajemen Akses / oleh admin UPA TIK)? …
- Alamat yang didaftarkan untuk website ini: …
- Metode kiriman ke alamat kembali (GET query / POST form / POST JSON): …
- Isi kiriman (nama parameter dan contohnya, dengan data pribadi disamarkan): …
- Apakah `state` dari langkah 1 diteruskan kembali? …

## 3. Memvalidasi kiriman (server-ke-server)

- Endpoint validasi: …
- Metode dan parameter: …
- Contoh respons (data pribadi disamarkan): …

## 4. Atribut pengguna

| Atribut | Nama di respons | Contoh (disamarkan) |
|---|---|---|
| UNILA ID / username | | |
| Nama | (`nm_pengguna`?) | |
| Email | | |
| Status aktif | (`a_aktif`?) | |
| Status dosen/karyawan/mahasiswa | | |

- Domain email mahasiswa: …
- Apakah UNILA ID dosen = NIP? …

## 5. Keluar (logout)

- URL keluar SSO (CAS `https://login.unila.ac.id/cas/logout` atau endpoint Access?): …
- Parameter kembali setelah keluar (`service`?): …

## 6. Lain-lain

- Batas permintaan (rate limit): …
- Lingkungan uji (staging) bila ada: …
