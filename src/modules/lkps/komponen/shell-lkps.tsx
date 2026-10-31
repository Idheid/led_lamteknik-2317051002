import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import type { GrupNav } from "@/components/shell/nav-sidebar";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { MENU_DATA_BERSAMA } from "@/components/shell/menu-peran";

/**
 * Menu LKPS (kerangka 31 Okt 2026). Ghalib menambah menu modul LKPS di sini, misalnya "Semua LKPS", "Impor Excel",
 * "Ekspor PDF per tabel".
 */
export const MENU_LKPS: GrupNav = {
  label: "Menu LKPS",
  item: [{ judul: "Beranda LKPS", href: "/lkps", ikon: "lkps", persis: true }],
};

/** Tata letak modul LKPS: menu LKPS dan (untuk penyusun) data bersama LKPS & LED. */
export async function ShellLkps({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  const grup = pengguna.peran === "PENANGGUNG_JAWAB" ? [MENU_LKPS, MENU_DATA_BERSAMA] : [MENU_LKPS];
  return (
    <ShellAplikasi pengguna={pengguna} grup={grup} judul="LKPS LAM Teknik" subjudul={fakultas?.nama ?? "Fakultas belum diisi"} beranda="/lkps">
      {children}
    </ShellAplikasi>
  );
}
