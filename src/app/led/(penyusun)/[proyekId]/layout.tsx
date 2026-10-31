import { notFound } from "next/navigation";
import { ShellLed } from "@/modules/led/komponen/shell-led";
import { GalatAkses } from "@/modules/bersama/akses";
import { ambilProyek } from "@/modules/led/data/proyek";
import { tugasProyek } from "@/modules/led/data/generate";
import { BannerAntrean } from "@/modules/led/komponen/narasi/banner-antrean";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";

/** Satu LED: sidebar menu LED ini (dengan Kembali ke Menu LED), banner antrean, tanda arsip. */
export default async function LayoutProyekLED({ children, params }: LayoutProps<"/led/[proyekId]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  let proyek;
  try {
    proyek = await ambilProyek(p, proyekId);
  } catch (e) {
    if (e instanceof GalatAkses) notFound();
    throw e;
  }
  const tugas = await tugasProyek(p, proyekId);
  return (
    <ShellLed pengguna={p} proyekId={proyekId}>
      {proyek.diarsipkanPada && (
        <Alert>
          <AlertTitle>LED ini diarsipkan</AlertTitle>
          <AlertDescription>Hanya bisa dibaca dan diekspor. Aktifkan kembali di Beranda LED → Pengaturan LED.</AlertDescription>
        </Alert>
      )}
      <BannerAntrean proyekId={proyekId} awal={tugas} />
      {children}
    </ShellLed>
  );
}
