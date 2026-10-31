import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ShellAplikasi } from "./shell-aplikasi";
import { ShellBersama } from "./shell-bersama";
import { MENU_ADMIN } from "./menu-peran";

/**
 * Tata letak menurut peran untuk halaman bersama (mis. Ganti kata sandi): sidebar admin, atau sidebar pilihan modul
 * (LKPS/LED) untuk penyusun dan asesor (31 Okt 2026).
 */
export async function ShellPeran({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  if (pengguna.peran === "SUPER_ADMIN") {
    return <ShellAplikasi pengguna={pengguna} grup={[MENU_ADMIN]} subjudul="Admin" beranda="/admin/akun">{children}</ShellAplikasi>;
  }
  return <ShellBersama pengguna={pengguna}>{children}</ShellBersama>;
}
