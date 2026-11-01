import type { ReactNode } from "react";
import { cookies } from "next/headers";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ShellAplikasi } from "./shell-aplikasi";
import { KUKI_MODUL, menuPeran, modulDariKuki } from "./menu-peran";

/**
 * Tata letak halaman bersama LED dan LKPS: Dashboard akreditasi, Program studi, Kelola akun, Kunci API, Penugasan
 * (Admin UPPS), juga Ganti kata sandi untuk semua peran. Sidebar: grup Bersama beserta grup modul terakhir yang dibuka
 * (LED atau LKPS, dari cookie), jadi fitur LED dan LKPS tidak pernah tercampur (D4).
 */
export async function ShellBersama({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const [fakultas, kuki] = await Promise.all([ambilFakultas(), cookies()]);
  const modul = modulDariKuki(kuki.get(KUKI_MODUL)?.value);
  return (
    <ShellAplikasi
      pengguna={pengguna}
      grup={menuPeran(pengguna.peran, modul)}
      modul={modul}
      subjudul={pengguna.peran === "ADMIN" ? `Admin UPPS · ${fakultas?.nama ?? "Fakultas belum diisi"}` : fakultas?.nama ?? "Fakultas belum diisi"}
      beranda="/"
    >
      {children}
    </ShellAplikasi>
  );
}
