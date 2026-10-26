import type { ReactNode } from "react";
import type { Pengguna } from "@/lib/akses";
import { ShellAplikasi } from "./shell-aplikasi";
import { ShellDaftarProyek } from "./shell-daftar-proyek";
import { MENU_ADMIN, MENU_ASESOR } from "./menu-peran";

/** Tata letak menurut peran untuk halaman bersama (mis. Ganti kata sandi): sidebar admin, asesor, atau Menu Utama PJ. */
export async function ShellPeran({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  if (pengguna.peran === "SUPER_ADMIN") {
    return <ShellAplikasi pengguna={pengguna} grup={[MENU_ADMIN]} subjudul="Admin" beranda="/admin/akun">{children}</ShellAplikasi>;
  }
  if (pengguna.peran === "ASESOR") {
    return <ShellAplikasi pengguna={pengguna} grup={[MENU_ASESOR]} subjudul="Asesor" beranda="/asesor">{children}</ShellAplikasi>;
  }
  return <ShellDaftarProyek pengguna={pengguna}>{children}</ShellDaftarProyek>;
}
