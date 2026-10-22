import type { ReactNode } from "react";
import type { Pengguna } from "@/lib/akses";
import { ambilFakultas } from "@/lib/data/organisasi";
import type { GrupNav } from "./nav-sidebar";
import { ShellAplikasi } from "./shell-aplikasi";

/** Menu PJ fakultas di luar satu LED (revisi 19 Okt 2026). */
export const MENU_FAKULTAS: GrupNav = {
  label: "Fakultas",
  item: [
    { judul: "Semua LED", href: "/proyek", ikon: "proyek", persis: true },
    { judul: "Program studi", href: "/proyek/prodi", ikon: "prodi" },
    { judul: "Instrumen", href: "/proyek/instrumen", ikon: "instrumen" },
    { judul: "Basis Pengetahuan fakultas", href: "/proyek/dokumen-bersama", ikon: "dokumen" },
    { judul: "Kunci API fakultas", href: "/proyek/kunci-api", ikon: "kunci" },
  ],
};

/** Tata letak halaman PJ fakultas di luar LED tertentu. */
export async function ShellDaftarProyek({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const fakultas = await ambilFakultas();
  return (
    <ShellAplikasi pengguna={pengguna} subjudul={fakultas?.nama ?? "Fakultas belum diisi"} beranda="/proyek" grup={[MENU_FAKULTAS]}>
      {children}
    </ShellAplikasi>
  );
}
