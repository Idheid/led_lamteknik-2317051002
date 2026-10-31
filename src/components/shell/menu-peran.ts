import type { Peran } from "@/modules/bersama/peran";
import type { GrupNav } from "./nav-sidebar";

/**
 * Menu sidebar admin (revisi 19 Okt 2026: akun dan kunci API; 22 Okt 2026: ditambah penugasan asesor). Dipakai layout
 * admin dan halaman bersama seperti Ganti kata sandi.
 */
export const MENU_ADMIN: GrupNav = {
  label: "Admin",
  item: [
    { judul: "Kelola akun", href: "/admin/akun", ikon: "akun" },
    { judul: "Penugasan asesor", href: "/admin/penugasan", ikon: "review" },
    { judul: "Kunci API", href: "/admin/kunci-api", ikon: "kunci" },
  ],
};

/** Menu sidebar asesor di modul LED (revisi 22 Okt 2026). */
export const MENU_ASESOR: GrupNav = {
  label: "LED · Asesor",
  item: [{ judul: "LED ditugaskan", href: "/led/asesor", ikon: "proyek", persis: true }],
};

/**
 * Data yang dipakai modul LKPS dan LED sekaligus (31 Okt 2026): daftar program studi dan identitas fakultas, serta kunci
 * API Gemini fakultas. Revisi 31 Okt 2026: hanya Admin UPPS.
 */
export const MENU_DATA_BERSAMA: GrupNav = {
  label: "Pengaturan UPPS",
  item: [
    { judul: "Program studi", href: "/pengaturan/prodi", ikon: "prodi" },
    { judul: "Kunci API", href: "/admin/kunci-api", ikon: "kunci" },
  ],
};

/** Alamat beranda modul LED menurut peran: asesor membuka LED yang ditugaskan, penyusun membuka Semua LED. */
export function berandaLed(peran: Peran): string {
  return peran === "ASESOR" ? "/led/asesor" : "/led";
}

/** Grup "Modul" untuk halaman di luar modul (data bersama, ganti kata sandi). */
export function menuModul(peran: Peran): GrupNav {
  return {
    label: "Modul",
    item: [
      { judul: "Halaman awal", href: "/", ikon: "dasbor", persis: true },
      { judul: "LKPS", href: "/lkps", ikon: "lkps" },
      { judul: "LED", href: berandaLed(peran), ikon: "bab" },
    ],
  };
}
