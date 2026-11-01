import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ShellAplikasi } from "./shell-aplikasi";
import { menuPeran } from "./menu-peran";

/**
 * Tata letak halaman bersama LED dan LKPS: Dashboard akreditasi, Program studi, Kelola akun, Kunci API, Penugasan
 * (Admin UPPS), juga Ganti kata sandi untuk semua peran. Sidebar: grup Bersama beserta grup LED dan LKPS.
 */
export async function ShellBersama({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  return (
    <ShellAplikasi
      pengguna={pengguna}
      grup={menuPeran(pengguna.peran, "bersama")}
      subjudul={pengguna.peran === "ADMIN" ? `Admin UPPS · ${fakultas?.nama ?? "Fakultas belum diisi"}` : fakultas?.nama ?? "Fakultas belum diisi"}
      beranda="/"
    >
      {children}
    </ShellAplikasi>
  );
}
