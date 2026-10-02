import type { ReactNode } from "react";
import type { Pengguna } from "@/lib/akses";
import { prodiSaya } from "@/lib/data/proyek";
import { ShellAplikasi } from "./shell-aplikasi";

/** Tata letak halaman penanggung jawab di luar proyek tertentu (daftar proyek, kunci API prodi). */
export async function ShellDaftarProyek({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const prodi = await prodiSaya(pengguna);
  return (
    <ShellAplikasi
      pengguna={pengguna}
      subjudul={prodi.nama}
      beranda="/proyek"
      grup={[{
        label: "Prodi",
        item: [
          { judul: "Semua proyek LED", href: "/proyek", ikon: "proyek", persis: true },
          { judul: "Kunci API", href: "/proyek/kunci-api", ikon: "kunci" },
        ],
      }]}
    >
      {children}
    </ShellAplikasi>
  );
}
