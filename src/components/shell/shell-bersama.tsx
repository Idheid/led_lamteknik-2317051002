import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ShellAplikasi } from "./shell-aplikasi";
import { MENU_DATA_BERSAMA, menuModul } from "./menu-peran";

/**
 * Tata letak halaman data bersama LKPS & LED (31 Okt 2026): Program studi dan identitas fakultas, Kunci API fakultas,
 * juga Ganti kata sandi untuk penyusun. Sidebar berisi pilihan modul dan menu data bersama.
 */
export async function ShellBersama({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  const grup = pengguna.peran === "PENANGGUNG_JAWAB" ? [menuModul(pengguna.peran), MENU_DATA_BERSAMA] : [menuModul(pengguna.peran)];
  return (
    <ShellAplikasi pengguna={pengguna} grup={grup} subjudul={fakultas?.nama ?? "Fakultas belum diisi"} beranda="/">
      {children}
    </ShellAplikasi>
  );
}
