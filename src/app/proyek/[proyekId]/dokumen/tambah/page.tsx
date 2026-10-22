import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ambilProyekUbah, pilihanSubBagianProyek } from "@/lib/data/proyek";
import { pilihanSubBagianBersama } from "@/lib/data/dokumen";
import { jalurAman } from "@/lib/jalur";
import { HalamanTambah } from "@/components/halaman-tambah";
import { UnggahDokumenUmum } from "../unggah-umum";

export const metadata: Metadata = { title: "Tambah dokumen" };

/** Tambah dokumen ke Basis Pengetahuan: dokumen LED ini (bawaan) atau dokumen bersama fakultas (?tab=bersama). */
export default async function HalamanTambahDokumen({ params, searchParams }: PageProps<"/proyek/[proyekId]/dokumen/tambah">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const q = await searchParams;
  const bersama = q.tab === "bersama";
  await ambilProyekUbah(p, proyekId);
  const pilihan = bersama ? await pilihanSubBagianBersama(p) : await pilihanSubBagianProyek(p, proyekId);
  const daftar = `/proyek/${proyekId}/dokumen${bersama ? "?tab=bersama" : ""}`;
  const kembali = jalurAman(q.kembali, daftar);
  return (
    <HalamanTambah
      judul={bersama ? "Tambah dokumen bersama fakultas" : "Tambah dokumen LED"}
      remah={[{ label: "Basis Pengetahuan", href: daftar }, { label: "Tambah dokumen" }]}
      kembali={kembali}
      catatan={bersama ? "Dokumen bersama dipakai semua LED fakultas (kode sumber U)." : "Dokumen diproses di latar; statusnya terlihat di Basis Pengetahuan."}
    >
      {bersama
        ? <UnggahDokumenUmum pilihan={pilihan} url="/api/dokumen-bersama" kembaliKe={kembali} />
        : <UnggahDokumenUmum proyekId={proyekId} pilihan={pilihan} awalSub={typeof q.sub === "string" ? q.sub : undefined} kembaliKe={kembali} />}
    </HalamanTambah>
  );
}
