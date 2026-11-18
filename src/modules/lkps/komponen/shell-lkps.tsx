import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { menuPeran } from "@/components/shell/menu-peran";
import { kriteriaTambahanAktif } from "@/modules/lkps/data/beranda";

/**
 * Tata letak modul LKPS: grup Bersama (sama dengan LED) dan grup LKPS (Gabung LKPS G5: Beranda, Identitas & tim,
 * K1–K9 ditambah kriteria dari konfigurasi aktif, Impor One Data, Ekspor Excel, Struktur kriteria & tabel untuk Admin).
 */
export async function ShellLkps({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  const [fakultas, tambahan] = await Promise.all([ambilFakultas(), kriteriaTambahanAktif(pengguna)]);
  return (
    <ShellAplikasi pengguna={pengguna} grup={menuPeran(pengguna.peran, "lkps", tambahan)} subjudul={fakultas?.nama ?? "Fakultas belum diisi"} beranda="/lkps">
      {children}
    </ShellAplikasi>
  );
}
