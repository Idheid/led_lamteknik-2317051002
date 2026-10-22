import { notFound } from "next/navigation";
import { ShellPj } from "@/components/shell/shell-daftar-proyek";
import { GalatAkses } from "@/lib/akses";
import { ambilProyek } from "@/lib/data/proyek";
import { tugasProyek } from "@/lib/data/generate";
import { BannerAntrean } from "@/components/narasi/banner-antrean";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { wajibPenanggungJawab } from "@/lib/sesi";

/** Satu LED: sidebar PJ bersama (menu LED ini + pengaturan fakultas), banner antrean, tanda arsip. */
export default async function LayoutProyekLED({ children, params }: LayoutProps<"/proyek/[proyekId]">) {
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
    <ShellPj pengguna={p} proyekId={proyekId}>
      {proyek.diarsipkanPada && (
        <Alert>
          <AlertTitle>LED ini diarsipkan</AlertTitle>
          <AlertDescription>Hanya bisa dibaca dan diekspor. Aktifkan kembali di Beranda LED → Pengaturan LED.</AlertDescription>
        </Alert>
      )}
      <BannerAntrean proyekId={proyekId} awal={tugas} />
      {children}
    </ShellPj>
  );
}
