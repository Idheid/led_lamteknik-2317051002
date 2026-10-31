import type { Peran } from "@/modules/bersama/peran";
import type { GrupNav } from "./nav-sidebar";

/**
 * Menu sidebar per peran (revisi 31 Okt 2026, Pak Tris): Admin UPPS, Tim Prodi, Asesor. Admin UPPS punya tiga grup
 * tetap di semua halamannya (Pengaturan UPPS, LED, LKPS); Tim Prodi dan asesor memakai menu modul masing-masing.
 */
export const MENU_PENGATURAN_UPPS: GrupNav = {
  label: "Pengaturan UPPS",
  item: [
    { judul: "Kelola akun", href: "/admin/akun", ikon: "akun" },
    { judul: "Program studi", href: "/pengaturan/prodi", ikon: "prodi" },
    { judul: "Kunci API", href: "/admin/kunci-api", ikon: "kunci" },
    { judul: "Penugasan asesor", href: "/admin/penugasan", ikon: "review" },
  ],
};

export const MENU_LED_ADMIN: GrupNav = {
  label: "LED",
  item: [
    { judul: "Pantau LED", href: "/led/pantau", ikon: "proyek" },
    { judul: "Instrumen", href: "/led/instrumen", ikon: "instrumen" },
    { judul: "Basis Pengetahuan fakultas", href: "/led/dokumen-bersama", ikon: "dokumen" },
  ],
};

/** Menu LKPS admin: kosong dulu (modul LKPS dikerjakan Ghalib); grup tanpa item tidak ditampilkan. */
export const MENU_LKPS_ADMIN: GrupNav = { label: "LKPS", item: [] };

export const MENU_ADMIN: GrupNav[] = [MENU_PENGATURAN_UPPS, MENU_LED_ADMIN, MENU_LKPS_ADMIN];

/** Menu sidebar asesor di modul LED (revisi 22 Okt 2026). */
export const MENU_ASESOR: GrupNav = {
  label: "LED · Asesor",
  item: [{ judul: "LED ditugaskan", href: "/led/asesor", ikon: "proyek", persis: true }],
};

/** Alamat beranda modul LED menurut peran: admin memantau semua LED, asesor LED yang ditugaskan, Tim Prodi LED prodinya. */
export function berandaLed(peran: Peran): string {
  if (peran === "ADMIN") return "/led/pantau";
  return peran === "ASESOR" ? "/led/asesor" : "/led";
}

/** Grup "Modul" untuk Tim Prodi dan asesor di halaman di luar modul (mis. Ganti kata sandi). */
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

/** Sidebar halaman di luar modul menurut peran. */
export function menuLuarModul(peran: Peran): GrupNav[] {
  return peran === "ADMIN" ? MENU_ADMIN : [menuModul(peran)];
}
