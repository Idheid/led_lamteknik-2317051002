import { wajibAsesor } from "@/modules/bersama/sesi";

/** Revisi 22 Okt 2026: halaman /led/asesor hanya untuk akun asesor. Tata letak sidebar dipasang per halaman. */
export default async function LayoutAsesor({ children }: LayoutProps<"/led/asesor">) {
  await wajibAsesor();
  return children;
}
