import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ShellBersama } from "./shell-bersama";

/** Tata letak menurut peran untuk halaman bersama (mis. Ganti kata sandi); sidebar mengikuti peran. */
export async function ShellPeran({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  return <ShellBersama pengguna={pengguna}>{children}</ShellBersama>;
}
