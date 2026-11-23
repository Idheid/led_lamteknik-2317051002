import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Aset panel kiri halaman masuk (permintaan Adrianne 23 Nov 2026, mengikuti tata letak apps.unila.ac.id: foto latar +
 * logo dalam lingkaran). Berkas di `public/login/`: `logo-lam-teknik.png` (logo resmi dari lamteknik.or.id) dan
 * `latar.webp` (foto gedung Fakultas Teknik Unila dari Adrianne), keduanya 23 Nov 2026. Bila tidak ada, halaman memakai
 * panel biru identitas aplikasi (desain S3). `.webp`/`.jpeg` dikecualikan dari proxy login (src/proxy.ts).
 */
const NAMA = {
  logo: ["logo-lam-teknik.svg", "logo-lam-teknik.png", "logo-lam-teknik.webp"],
  latar: ["latar.jpg", "latar.jpeg", "latar.webp", "latar.png"],
} as const;

function cari(daftar: readonly string[]): string | null {
  const ada = daftar.find((n) => existsSync(join(process.cwd(), "public", "login", n)));
  return ada ? `/login/${ada}` : null;
}

export function asetLogin(): { logo: string | null; latar: string | null } {
  return { logo: cari(NAMA.logo), latar: cari(NAMA.latar) };
}
