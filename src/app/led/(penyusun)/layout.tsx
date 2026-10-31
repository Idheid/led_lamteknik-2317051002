import { wajibPeran } from "@/modules/bersama/sesi";

/**
 * Halaman penyusun LED (/led, /led/baru, /led/[proyekId]/*, /led/instrumen, /led/dokumen-bersama) hanya untuk penanggung
 * jawab. Grup rute (penyusun) memisahkannya dari /led/asesor tanpa mengubah alamat. Tata letak sidebar dipasang per halaman.
 */
export default async function LayoutPenyusunLed({ children }: LayoutProps<"/led">) {
  await wajibPeran("ADMIN", "TIM_PRODI");
  return children;
}
