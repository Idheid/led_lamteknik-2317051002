"use client";

import { Petunjuk } from "@/components/petunjuk";
import { bolehTulisLkps, type AreaLkps } from "@/modules/lkps/domain/akses";
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/components/common/role-notice.tsx.
// Gabung LKPS G5: peran dari kerangka LED (konteks LKPS), hak tulis dari matriks src/modules/lkps/domain/akses.ts, dan
// pemberitahuan memakai Petunjuk LED.

/** Nama modul kode asal (`LkpsModule`). */
export type ModulLkps =
  | "identitas" | "kerjasama" | "mahasiswa" | "sdm" | "keuangan" | "pendidikan" | "penelitian" | "pkm" | "luaran"
  | "penjaminan" | "export" | "konfigurasi";

function areaModul(modul: ModulLkps): AreaLkps {
  if (modul === "identitas" || modul === "konfigurasi") return modul;
  if (modul === "export") return "ekspor";
  return "kriteria";
}

/** Pengganti `useModulePermission` kode asal; nama kolom hasil dipertahankan supaya halaman tidak berubah. */
export function useModulePermission(modul: ModulLkps) {
  const { peran } = useInfoLkps();
  const area = areaModul(modul);
  return {
    role: peran,
    canEdit: area === "ekspor" ? true : bolehTulisLkps(peran, area),
    isAsesor: peran === "ASESOR",
    isOperator: peran === "TIM_PRODI",
    isUpps: peran === "ADMIN",
    isSuperAdmin: peran === "ADMIN",
    loading: false,
  };
}

export default function RoleNotice({ module: modul, customMessage }: { module: ModulLkps; customMessage?: string }) {
  const { canEdit, isAsesor, isOperator, isUpps } = useModulePermission(modul);
  if (canEdit) return null;
  const pesan = customMessage
    ?? (isAsesor
      ? "Anda masuk sebagai reviewer LPMPP. Semua isian terkunci; data LKPS hanya dapat dibaca."
      : isOperator
        ? "Data modul ini dikelola Admin UPPS untuk seluruh fakultas."
        : isUpps
          ? "Anda memantau sebagai Admin UPPS. Isian kriteria LKPS diisi dan diubah oleh Tim Prodi."
          : "Akun Anda tidak memiliki hak ubah pada modul ini.");
  return (
    <div style={{ marginBottom: "20px" }}>
      <Petunjuk kunci={`lkps-baca-${modul}`} fungsi={<><strong>Mode hanya baca.</strong> {pesan}</>} langkah={[]} />
    </div>
  );
}
