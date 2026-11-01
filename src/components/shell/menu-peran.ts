import type { Peran } from "@/modules/bersama/peran";
import type { GrupNav } from "./nav-sidebar";

/**
 * Menu sidebar per peran. Desain form 2 (2 Nov 2026): LED dan LKPS LAM Teknik satu aplikasi, satu menu per peran,
 * tanpa halaman "Pilih modul" dan tanpa pengaturan yang berulang. Admin UPPS: Pemantauan, Penyusunan, Pengaturan
 * UPPS. Tim Prodi: Prodi saya (LED, Data LKPS, Identitas prodi). Reviewer LPMPP (peran ASESOR): LED ditugaskan.
 */
export const MENU_PEMANTAUAN: GrupNav = {
  label: "Pemantauan",
  item: [
    { judul: "Dashboard akreditasi", href: "/led/pantau", ikon: "dasbor" },
    { judul: "Penugasan reviewer LPMPP", href: "/admin/penugasan", ikon: "review" },
  ],
};

export const MENU_PENYUSUNAN_ADMIN: GrupNav = {
  label: "Penyusunan LED & LKPS",
  item: [
    { judul: "Instrumen", href: "/led/instrumen", ikon: "instrumen" },
    { judul: "Basis Pengetahuan fakultas", href: "/led/dokumen-bersama", ikon: "dokumen" },
  ],
};

export const MENU_PENGATURAN_UPPS: GrupNav = {
  label: "Pengaturan UPPS",
  item: [
    { judul: "Program studi", href: "/pengaturan/prodi", ikon: "prodi" },
    { judul: "Kelola akun", href: "/admin/akun", ikon: "akun" },
    { judul: "Kunci API dan model AI", href: "/admin/kunci-api", ikon: "kunci" },
  ],
};

export const MENU_ADMIN: GrupNav[] = [MENU_PEMANTAUAN, MENU_PENYUSUNAN_ADMIN, MENU_PENGATURAN_UPPS];

/** Menu Tim Prodi: semua yang dikerjakan untuk prodinya di satu tempat. */
export const MENU_TIM_PRODI: GrupNav = {
  label: "Prodi saya",
  item: [
    { judul: "LED prodi", href: "/led", ikon: "proyek", persis: true },
    { judul: "Data LKPS", href: "/lkps", ikon: "lkps" },
    { judul: "Identitas prodi", href: "/led/identitas-prodi", ikon: "prodi" },
  ],
};

/** Menu reviewer LPMPP (peran ASESOR) di modul LED. */
export const MENU_ASESOR: GrupNav = {
  label: "Review LPMPP",
  item: [{ judul: "LED ditugaskan", href: "/led/asesor", ikon: "proyek", persis: true }],
};

/** Beranda menurut peran: Admin UPPS dashboard akreditasi, reviewer LED yang ditugaskan, Tim Prodi LED prodinya. */
export function berandaLed(peran: Peran): string {
  if (peran === "ADMIN") return "/led/pantau";
  return peran === "ASESOR" ? "/led/asesor" : "/led";
}

/** Sidebar halaman di luar LED (Ganti kata sandi, Data LKPS) menurut peran. */
export function menuLuarModul(peran: Peran): GrupNav[] {
  if (peran === "ADMIN") return MENU_ADMIN;
  return peran === "ASESOR" ? [MENU_ASESOR] : [MENU_TIM_PRODI];
}
