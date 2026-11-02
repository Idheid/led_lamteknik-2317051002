import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import type { GrupNav } from "@/components/shell/nav-sidebar";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { menuPeran } from "@/components/shell/menu-peran";

/**
 * Menu LKPS (kerangka 31 Okt 2026). Ghalib menambah menu modul LKPS di sini, misalnya "Semua LKPS", "Impor Excel",
 * "Ekspor PDF per tabel".
 */
export const MENU_LKPS: GrupNav = {
  label: "Menu LKPS",
  item: [{ judul: "Beranda LKPS", href: "/lkps", ikon: "lkps", persis: true }],
};

/**
 * Tata letak modul LKPS: grup Bersama (sama dengan LED) dan grup LKPS. Menu modul LKPS Ghalib (MENU_LKPS) dimasukkan ke
 * grup LKPS di menu-peran.ts saat modulnya siap.
 */
export async function ShellLkps({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  return (
    <ShellAplikasi pengguna={pengguna} grup={menuPeran(pengguna.peran, "lkps")} subjudul={fakultas?.nama ?? "Fakultas belum diisi"} beranda="/lkps">
      {children}
    </ShellAplikasi>
  );
}
