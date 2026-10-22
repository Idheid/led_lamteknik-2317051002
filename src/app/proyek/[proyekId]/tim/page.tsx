import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { timPenyusun } from "@/lib/data/ekspor";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormTim } from "./form-tim";

export const metadata: Metadata = { title: "Tim penyusun" };

export default async function HalamanTim({ params }: PageProps<"/proyek/[proyekId]/tim">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const tim = await timPenyusun(p, proyekId);
  const ke = (x: typeof tim.dosen) => x.map((a) => ({ nama: a.nama, nomorInduk: a.nomorInduk ?? "", jabatan: a.jabatan ?? "", tugas: a.tugas ?? "" }));
  return (
    <>
      <JudulHalaman
        judul="Tim penyusun"
        remah={[{ label: "Beranda LED", href: `/proyek/${proyekId}` }, { label: "Tim penyusun" }]}
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
      <FormTim proyekId={proyekId} awal={{ dosen: ke(tim.dosen), tendik: ke(tim.tendik) }} />
    </>
  );
}
