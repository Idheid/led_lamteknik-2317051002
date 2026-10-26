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

/** Menu sidebar asesor (revisi 22 Okt 2026). */
export const MENU_ASESOR: GrupNav = {
  label: "Asesor",
  item: [{ judul: "LED ditugaskan", href: "/asesor", ikon: "proyek", persis: true }],
};
