# Panduan instalasi di Windows

Untuk menjalankan dan mengembangkan sistem ini di laptop Windows.

## Next.js dan Node.js, bedanya apa?

**Next.js** adalah kerangka (framework) untuk membuat website. **Node.js** adalah program yang menjalankan kode
JavaScript/TypeScript di komputer, termasuk Next.js. Jadi proyek ini memakai Next.js, dan Next.js butuh Node.js
terpasang. Next.js sendiri tidak perlu dipasang manual: ia ikut terpasang ke folder proyek saat `npm install`.

## Yang perlu dipasang

| Program | Untuk apa | Unduh |
| --- | --- | --- |
| Node.js (versi LTS) | Menjalankan Next.js, Prisma, dan worker. Next.js 16 butuh Node.js 20.9 atau lebih baru | https://nodejs.org (pilih tombol LTS) |
| Git for Windows | Riwayat kode dan dipakai Claude Code untuk menjalankan perintah | https://git-scm.com/downloads/win |
| Docker Desktop | Menjalankan PostgreSQL + pgvector tanpa memasang manual (pgvector sulit dipasang langsung di Windows) | https://www.docker.com/products/docker-desktop |
| Claude desktop app (tab Code) | Claude Code yang membangun aplikasinya bersama Anda | https://claude.com/download |
| LibreOffice | Menghitung jumlah halaman berkas Word hasil ekspor (iterasi 4) | https://www.libreoffice.org/download |

Docker Desktop di Windows memakai WSL 2; ikuti petunjuk pemasangnya bila diminta mengaktifkan WSL dan restart.

Setelah dipasang, buka **PowerShell** dan cek:

```powershell
node -v      # minimal v20.9 (pilih versi LTS terbaru)
npm -v
git --version
docker --version
```

## Kunci API Gemini

1. Buka https://aistudio.google.com, masuk dengan akun Google.
2. Pilih **Get API key** lalu buat kunci. Simpan kunci di tempat aman; jangan dibagikan atau di-commit ke Git.
3. Kunci dimasukkan lewat menu **Kunci API** di aplikasi (bukan di kode).

Catatan: kuota Gemini dihitung per project Google. Kunci kedua dari project yang sama ikut habis bersama kunci pertama,
jadi kunci cadangan sebaiknya dari project atau akun lain. Untuk data asli prodi, pertimbangkan kunci berbayar karena
data di layanan gratis boleh dipakai Google untuk mengembangkan produknya.

## Membuka proyek di Claude Code

Claude Code butuh langganan Claude berbayar (Pro, Max, Team, atau Enterprise).

1. Buka aplikasi Claude desktop, klik tab **Code** di bagian atas.
2. Pilih **Local**, klik **Select folder**, pilih folder `D:\Skripsi\led-lamteknik`.
3. Claude Code otomatis membaca `CLAUDE.md`. Ketik permintaan pertama, misalnya:

   > Baca CLAUDE.md dan docs/RENCANA-ITERASI.md, lalu kerjakan iterasi 1 mulai dari bootstrap. Berhenti dan laporkan
   > setelah kriteria selesai iterasi 1 terpenuhi.

4. Pilih mode izin **Manual** di awal supaya Anda melihat setiap perubahan sebelum diterapkan; setelah terbiasa boleh
   pindah ke **Accept edits**.

Alternatif lewat terminal: pasang Claude Code CLI di PowerShell dengan `irm https://claude.ai/install.ps1 | iex`,
buka folder proyek, lalu jalankan `claude`.

## Menjalankan aplikasi (setelah iterasi 1 dibuat)

```powershell
cd D:\Skripsi\led-lamteknik
docker compose up -d          # menyalakan PostgreSQL + pgvector
copy .env.example .env        # lalu isi nilainya
npm install
npm run db:migrate
npm run db:seed               # super admin + instrumen LAM Teknik 2025
npm run dev                   # buka http://localhost:3000
```

Mulai iterasi 2, jalankan juga worker di jendela PowerShell kedua: `npm run worker`.
