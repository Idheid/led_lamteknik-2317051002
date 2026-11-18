"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Peran } from "@/modules/bersama/peran";

/**
 * Konteks modul LKPS (Gabung LKPS G5): peran pengguna dan prodi aktif dari layout LKPS (server). Pengganti `useSession`
 * Better Auth kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff) di halaman klien LKPS; hak tulis sebenarnya tetap
 * diperiksa lapisan data (src/modules/lkps/data).
 */
export interface InfoLkps {
  peran: Peran;
  prodiId: string | null;
  namaProdi: string | null;
}

const KonteksLkps = createContext<InfoLkps | null>(null);

export function PenyediaLkps({ nilai, children }: { nilai: InfoLkps; children: ReactNode }) {
  return <KonteksLkps.Provider value={nilai}>{children}</KonteksLkps.Provider>;
}

export function useInfoLkps(): InfoLkps {
  const k = useContext(KonteksLkps);
  if (!k) throw new Error("useInfoLkps hanya dipakai di dalam layout LKPS.");
  return k;
}
