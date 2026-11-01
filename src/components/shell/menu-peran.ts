import type { Peran } from "@/modules/bersama/peran";
import type { GrupNav } from "./nav-sidebar";

/**
 * Menu sidebar per peran (desain form 2, 2 Nov 2026, disesuaikan atas permintaan Adrianne): tombol LKPS | LED di kepala
 * halaman memindahkan antara fitur khusus LKPS dan khusus LED; fitur yang sama atau harus selaras untuk keduanya
 * (dashboard, program studi, akun, kunci API, instrumen, penugasan reviewer, identitas prodi) ada di grup "Bersama" yang
 * tampil di kedua modul. D4: sidebar tidak pernah mencampur grup LED dan LKPS; di halaman bersama (mis. Dashboard) yang
 * tampil adalah modul terakhir yang dibuka (cookie KUKI_MODUL, diisi tombol LKPS | LED).
 */

export type KonteksMenu = "led" | "lkps";

/** Cookie modul terakhir yang dibuka; dibaca halaman bersama supaya sidebar tetap Bersama + modul itu. */
export const KUKI_MODUL = "modul_terakhir";

export function modulDariKuki(nilai: string | undefined): KonteksMenu {
  return nilai === "lkps" ? "lkps" : "led";
}

const LABEL_BERSAMA = "Bersama (LED & LKPS)";
const LABEL_LED = "LED · Laporan Evaluasi Diri";
const LABEL_LKPS = "LKPS · Laporan Kinerja Prodi";

// ---------------------------------------------------------------- Admin UPPS

export const MENU_BERSAMA_ADMIN: GrupNav = {
  label: LABEL_BERSAMA,
  item: [
    { judul: "Dashboard akreditasi", href: "/dashboard", ikon: "dasbor" },
    { judul: "Program studi", href: "/pengaturan/prodi", ikon: "prodi" },
    { judul: "Instrumen LAM Teknik", href: "/led/instrumen", ikon: "instrumen" },
    { judul: "Penugasan reviewer LPMPP", href: "/admin/penugasan", ikon: "review" },
    { judul: "Kelola akun", href: "/admin/akun", ikon: "akun" },
    { judul: "Kunci API dan model AI", href: "/admin/kunci-api", ikon: "kunci" },
  ],
};

export const MENU_LED_ADMIN: GrupNav = {
  label: LABEL_LED,
  item: [
    { judul: "Pantau LED prodi", href: "/led/pantau", ikon: "proyek" },
    { judul: "Basis Pengetahuan fakultas", href: "/led/dokumen-bersama", ikon: "dokumen" },
  ],
};

export const MENU_LKPS_ADMIN: GrupNav = {
  label: LABEL_LKPS,
  item: [{ judul: "Kelengkapan LKPS prodi", href: "/lkps", ikon: "lkps", persis: true }],
};

// ---------------------------------------------------------------- Tim Prodi

export const MENU_BERSAMA_TIM: GrupNav = {
  label: LABEL_BERSAMA,
  item: [{ judul: "Identitas prodi", href: "/led/identitas-prodi", ikon: "prodi" }],
};

export const MENU_LED_TIM: GrupNav = {
  label: LABEL_LED,
  item: [{ judul: "LED prodi", href: "/led", ikon: "proyek", persis: true }],
};

export const MENU_LKPS_TIM: GrupNav = {
  label: LABEL_LKPS,
  item: [{ judul: "Data LKPS", href: "/lkps", ikon: "lkps", persis: true }],
};

// ---------------------------------------------------------------- Reviewer LPMPP (peran ASESOR)

export const MENU_ASESOR: GrupNav = {
  label: LABEL_LED,
  item: [{ judul: "LED ditugaskan", href: "/led/asesor", ikon: "proyek", persis: true }],
};

export const MENU_LKPS_ASESOR: GrupNav = {
  label: LABEL_LKPS,
  item: [{ judul: "Data LKPS", href: "/lkps", ikon: "lkps", persis: true }],
};

function grupPeran(peran: Peran): { bersama: GrupNav | null; led: GrupNav; lkps: GrupNav } {
  if (peran === "ADMIN") return { bersama: MENU_BERSAMA_ADMIN, led: MENU_LED_ADMIN, lkps: MENU_LKPS_ADMIN };
  if (peran === "ASESOR") return { bersama: null, led: MENU_ASESOR, lkps: MENU_LKPS_ASESOR };
  return { bersama: MENU_BERSAMA_TIM, led: MENU_LED_TIM, lkps: MENU_LKPS_TIM };
}

/** Sidebar menurut peran dan modul yang sedang dibuka: Bersama + LED atau Bersama + LKPS. */
export function menuPeran(peran: Peran, konteks: KonteksMenu): GrupNav[] {
  const g = grupPeran(peran);
  const modul = konteks === "lkps" ? g.lkps : g.led;
  return g.bersama ? [g.bersama, modul] : [modul];
}

/** Beranda LED menurut peran (tombol LED): Admin UPPS Pantau LED prodi, reviewer LED ditugaskan, Tim Prodi LED prodinya. */
export function berandaLed(peran: Peran): string {
  if (peran === "ADMIN") return "/led/pantau";
  return peran === "ASESOR" ? "/led/asesor" : "/led";
}

/** Halaman awal setelah login: Admin UPPS ke Dashboard akreditasi (bersama), peran lain ke beranda LED. */
export function berandaPeran(peran: Peran): string {
  return peran === "ADMIN" ? "/dashboard" : berandaLed(peran);
}
