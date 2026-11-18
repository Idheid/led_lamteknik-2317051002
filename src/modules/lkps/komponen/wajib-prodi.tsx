import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { wajibPeran } from "@/modules/bersama/sesi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { prodiAktifHalaman } from "@/modules/lkps/komponen/prodi-halaman";

/**
 * Halaman LKPS yang butuh prodi aktif (Gabung LKPS G5). Admin UPPS dan reviewer LPMPP yang belum memilih prodi melihat
 * ajakan memilih prodi, bukan data prodi pertama di basis data (masalah 8 di GABUNG-LKPS-PETA.md).
 */
export async function WajibProdi({ judul, children }: { judul: string; children: ReactNode }) {
  const p = await wajibPeran("ADMIN", "TIM_PRODI", "ASESOR");
  if (await prodiAktifHalaman(p)) return children;
  return (
    <>
      <JudulHalaman judul={judul} />
      <Alert className="max-w-2xl">
        <Building2 aria-hidden />
        <AlertTitle>Pilih program studi</AlertTitle>
        <AlertDescription>
          {p.peran === "ASESOR"
            ? "Pilih program studi di atas. Daftar hanya berisi program studi yang LED-nya ditugaskan kepada Anda."
            : "Pilih program studi di atas untuk membuka data LKPS-nya."}
        </AlertDescription>
      </Alert>
    </>
  );
}
