import type { Metadata } from "next";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { ambilProyekUbah, pilihanSubBagianProyek } from "@/modules/led/data/proyek";
import { jalurAman } from "@/modules/bersama/jalur";
import { HalamanTambah } from "@/components/halaman-tambah";
import { UnggahDokumenUmum } from "../unggah-umum";

export const metadata: Metadata = { title: "Tambah dokumen" };

/** Tambah dokumen LED ini. Dokumen bersama fakultas diunggah Admin UPPS (revisi 31 Okt 2026, B6). */
export default async function HalamanTambahDokumen({ params, searchParams }: PageProps<"/led/[proyekId]/dokumen/tambah">) {
  const p = await wajibTimProdi();
  const { proyekId } = await params;
  const q = await searchParams;
  await ambilProyekUbah(p, proyekId);
  const pilihan = await pilihanSubBagianProyek(p, proyekId);
  const daftar = `/led/${proyekId}/dokumen`;
  const kembali = jalurAman(q.kembali, daftar);
  return (
    <HalamanTambah
      judul="Tambah dokumen LED"
      remah={[{ label: "Basis Pengetahuan", href: daftar }, { label: "Tambah dokumen" }]}
      kembali={kembali}
      catatan="Dokumen diproses di latar; statusnya terlihat di Basis Pengetahuan."
    >
      <UnggahDokumenUmum proyekId={proyekId} pilihan={pilihan} awalSub={typeof q.sub === "string" ? q.sub : undefined} kembaliKe={kembali} />
    </HalamanTambah>
  );
}
