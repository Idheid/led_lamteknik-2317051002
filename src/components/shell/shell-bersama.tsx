import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ShellAplikasi } from "./shell-aplikasi";
import { MENU_DATA_BERSAMA, menuModul } from "./menu-peran";

/**
 * Tata letak halaman di luar modul (31 Okt 2026): Program studi dan identitas fakultas (Admin UPPS), juga Ganti kata
 * sandi untuk Tim Prodi dan asesor. Sidebar berisi pilihan modul, ditambah menu Pengaturan UPPS untuk admin.
 */
export async function ShellBersama({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  const grup = pengguna.peran === "ADMIN" ? [menuModul(pengguna.peran), MENU_DATA_BERSAMA] : [menuModul(pengguna.peran)];
  return (
    <ShellAplikasi pengguna={pengguna} grup={grup} subjudul={fakultas?.nama ?? "Fakultas belum diisi"} beranda="/">
      {children}
    </ShellAplikasi>
  );
}
