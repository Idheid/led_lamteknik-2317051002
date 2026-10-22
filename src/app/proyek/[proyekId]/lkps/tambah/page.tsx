import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ambilProyekUbah } from "@/lib/data/proyek";
import { formatTahunAkademik } from "@/lib/domain/tahun-akademik";
import { HalamanTambah } from "@/components/halaman-tambah";
import { UnggahBerkas } from "@/components/unggah-berkas";

export const metadata: Metadata = { title: "Tambah data LKPS" };

export default async function HalamanTambahLkps({ params }: PageProps<"/proyek/[proyekId]/lkps/tambah">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const proyek = await ambilProyekUbah(p, proyekId);
  const kembali = `/proyek/${proyekId}/lkps`;
  return (
    <HalamanTambah
      judul="Tambah data LKPS"
      remah={[{ label: "Data LKPS", href: kembali }, { label: "Tambah" }]}
      kembali={kembali}
      catatan={`Pakai template LKPS LAM Teknik 2025 tanpa mengubah nama sheet. Berkas terbaru yang terbaca menjadi sumber data. TS LED ini: ${formatTahunAkademik(proyek.tsTahunMulai)}.`}
    >
      <UnggahBerkas
        url={`/api/proyek/${proyekId}/lkps`}
        accept=".xlsx,.pdf"
        label="Pilih berkas LKPS"
        keterangan="Excel (.xlsx) atau PDF, maksimal 25 MB"
        kembaliKe={kembali}
      />
    </HalamanTambah>
  );
}
