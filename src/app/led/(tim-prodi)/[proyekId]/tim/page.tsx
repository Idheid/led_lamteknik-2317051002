import type { Metadata } from "next";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { timPenyusun } from "@/modules/led/data/ekspor";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormTim } from "./form-tim";
import { ambilProyek } from "@/modules/led/data/proyek";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Tim penyusun" };

export default async function HalamanTim({ params }: PageProps<"/led/[proyekId]/tim">) {
  const p = await wajibTimProdi();
  const { proyekId } = await params;
  const tim = await timPenyusun(p, proyekId);
  // L5: tim disalin dari LED periode lalu; tanda hilang setelah disimpan ulang
  const periksaUlang = Boolean(((await ambilProyek(p, proyekId)).timPenyusun as { periksaUlang?: boolean } | null)?.periksaUlang);
  const ke = (x: typeof tim.dosen) => x.map((a) => ({ nama: a.nama, nomorInduk: a.nomorInduk ?? "", jabatan: a.jabatan ?? "", tugas: a.tugas ?? "" }));
  return (
    <>
      <JudulHalaman
        judul="Tim penyusun"
        remah={[{ label: "Beranda LED", href: `/led/${proyekId}` }, { label: "Tim penyusun" }]}
      />
      <Petunjuk
        kunci="proyek-tim"
        fungsi="Daftar dosen dan tenaga kependidikan yang menyusun LED. Data ini tidak dikirim ke Gemini; hanya dipakai di berkas Word."
        langkah={[
          "Tambahkan dosen anggota tim (urutan pertama sebagai ketua) beserta NIP/NIDN/NUPTK, jabatan, dan deskripsi kerja.",
          "Tambahkan tenaga kependidikan yang membantu bila ada.",
          "Klik Simpan tim penyusun, lalu lanjut ke menu Ekspor Word.",
        ]}
      />
      {periksaUlang && (
        <Alert>
          <AlertTitle>Periksa ulang tim penyusun</AlertTitle>
          <AlertDescription>Tim ini disalin dari LED periode lalu. Perbarui anggota, jabatan, dan tugasnya, lalu simpan.</AlertDescription>
        </Alert>
      )}
      <FormTim proyekId={proyekId} awal={{ dosen: ke(tim.dosen), tendik: ke(tim.tendik) }} />
    </>
  );
}
