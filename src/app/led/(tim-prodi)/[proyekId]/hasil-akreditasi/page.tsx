import type { Metadata } from "next";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { ambilProyek } from "@/modules/led/data/proyek";
import { statusHasilAkreditasi } from "@/modules/led/data/akreditasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormHasilAkreditasi } from "@/modules/led/komponen/akreditasi/form-hasil-akreditasi";

export const metadata: Metadata = { title: "Catat hasil akreditasi" };

/** Tim Prodi mencatat hasil akreditasi LED yang diajukan (L1); berlaku setelah dikonfirmasi Admin UPPS. */
export default async function HalamanHasilAkreditasi({ params }: PageProps<"/led/[proyekId]/hasil-akreditasi">) {
  const p = await wajibTimProdi();
  const { proyekId } = await params;
  const proyek = await ambilProyek(p, proyekId);
  const status = await statusHasilAkreditasi(p, proyek);
  return (
    <>
      <JudulHalaman
        judul="Catat hasil akreditasi"
        deskripsi={proyek.nama}
        remah={[{ label: "Beranda", href: `/led/${proyek.id}` }, { label: "Catat hasil akreditasi" }]}
      />
      <Petunjuk
        kunci="tim-hasil-akreditasi"
        fungsi="Mencatat SK akreditasi hasil LED ini. Setelah dikonfirmasi Admin UPPS, tanggal berakhir akreditasi prodi diperbarui dan LED ini diarsipkan."
        langkah={[
          "Pilih PDF SK, lalu klik Isi dari PDF SK. Periksa isian yang ditandai \"dari SK\".",
          "Bila polanya tidak dikenali, isi manual atau klik Baca dengan AI (memakai token).",
          "Simpan. Admin UPPS akan mengonfirmasi catatan ini.",
        ]}
      />
      {status.boleh
        ? <FormHasilAkreditasi prodiId={proyek.prodiId} proyekId={proyek.id} admin={false} kembaliKe={`/led/${proyek.id}`} />
        : <Alert><AlertDescription>{status.alasan}</AlertDescription></Alert>}
    </>
  );
}
