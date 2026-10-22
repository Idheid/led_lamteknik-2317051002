import { wajibAsesor } from "@/lib/sesi";

/** Revisi 22 Okt 2026: halaman /asesor hanya untuk akun asesor. Tata letak sidebar dipasang per halaman. */
export default async function LayoutAsesor({ children }: LayoutProps<"/asesor">) {
  await wajibAsesor();
  return children;
}
