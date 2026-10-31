import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ShellAplikasi } from "./shell-aplikasi";
import { menuLuarModul } from "./menu-peran";

/**
 * Tata letak halaman di luar modul (31 Okt 2026): Program studi dan identitas fakultas, Kelola akun, Kunci API (Admin
 * UPPS), juga Ganti kata sandi untuk semua peran. Sidebar mengikuti peran (src/components/shell/menu-peran.ts).
 */
export async function ShellBersama({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  return (
    <ShellAplikasi
      pengguna={pengguna}
      grup={menuLuarModul(pengguna.peran)}
      subjudul={pengguna.peran === "ADMIN" ? `Admin UPPS · ${fakultas?.nama ?? "Fakultas belum diisi"}` : fakultas?.nama ?? "Fakultas belum diisi"}
      beranda="/"
    >
      {children}
    </ShellAplikasi>
  );
}
