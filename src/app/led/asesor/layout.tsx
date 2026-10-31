import { wajibPeran } from "@/modules/bersama/sesi";

/**
 * Revisi 22 Okt 2026: halaman /led/asesor untuk akun asesor. Revisi 31 Okt 2026: Admin UPPS juga membaca satu LED di
 * /led/asesor/[proyekId] (hanya baca, tanpa alat catatan dan skor); daftar /led/asesor tetap khusus asesor.
 */
export default async function LayoutAsesor({ children }: LayoutProps<"/led/asesor">) {
  await wajibPeran("ASESOR", "ADMIN");
  return children;
}
