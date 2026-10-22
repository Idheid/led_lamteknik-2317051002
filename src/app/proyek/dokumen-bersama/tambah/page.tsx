import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { pilihanSubBagianBersama } from "@/lib/data/dokumen";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { HalamanTambah } from "@/components/halaman-tambah";
import { UnggahDokumenUmum } from "@/app/proyek/[proyekId]/dokumen/unggah-umum";

export const metadata: Metadata = { title: "Tambah dokumen bersama" };

export default async function HalamanTambahDokumenBersama() {
  const p = await wajibPenanggungJawab();
  const pilihan = await pilihanSubBagianBersama(p);
  return (
    <ShellDaftarProyek pengguna={p}>
      <HalamanTambah
        judul="Tambah dokumen bersama fakultas"
        remah={[{ label: "Basis Pengetahuan fakultas", href: "/proyek/dokumen-bersama" }, { label: "Tambah dokumen" }]}
        kembali="/proyek/dokumen-bersama"
        catatan="Dokumen bersama dipakai semua LED fakultas (kode sumber U)."
      >
        <UnggahDokumenUmum pilihan={pilihan} url="/api/dokumen-bersama" kembaliKe="/proyek/dokumen-bersama" />
      </HalamanTambah>
    </ShellDaftarProyek>
  );
}
