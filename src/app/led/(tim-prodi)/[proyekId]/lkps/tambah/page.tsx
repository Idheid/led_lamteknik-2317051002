import type { Metadata } from "next";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { ambilProyekUbah } from "@/modules/led/data/proyek";
import { formatTahunAkademik } from "@/modules/bersama/domain/tahun-akademik";
import { HalamanTambah } from "@/components/halaman-tambah";
import { UnggahBerkas } from "@/components/unggah-berkas";

export const metadata: Metadata = { title: "Tambah data LKPS" };

export default async function HalamanTambahLkps({ params }: PageProps<"/led/[proyekId]/lkps/tambah">) {
  const p = await wajibTimProdi();
  const { proyekId } = await params;
  const proyek = await ambilProyekUbah(p, proyekId);
  const kembali = `/led/${proyekId}/lkps`;
  return (
    <HalamanTambah
      judul="Tambah data LKPS"
      remah={[{ label: "Data LKPS", href: kembali }, { label: "Tambah" }]}
      kembali={kembali}
      catatan={`Pakai template LKPS LAM Teknik 2025 tanpa mengubah nama sheet. Berkas terbaru yang terbaca menjadi sumber data. TS LED ini: ${formatTahunAkademik(proyek.tsTahunMulai)}.`}
    >
      <UnggahBerkas
        url={`/api/led/proyek/${proyekId}/lkps`}
        accept=".xlsx,.pdf"
        label="Pilih berkas LKPS"
        keterangan="Excel (.xlsx) atau PDF, maksimal 25 MB"
        kembaliKe={kembali}
      />
    </HalamanTambah>
  );
}
