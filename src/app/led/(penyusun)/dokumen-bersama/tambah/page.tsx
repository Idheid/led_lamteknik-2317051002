import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { pilihanSubBagianBersama } from "@/modules/led/data/dokumen";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { HalamanTambah } from "@/components/halaman-tambah";
import { UnggahDokumenUmum } from "@/app/led/(penyusun)/[proyekId]/dokumen/unggah-umum";

export const metadata: Metadata = { title: "Tambah dokumen bersama" };

export default async function HalamanTambahDokumenBersama() {
  const p = await wajibPenanggungJawab();
  const pilihan = await pilihanSubBagianBersama(p);
  return (
    <ShellMenuLed pengguna={p}>
      <HalamanTambah
        judul="Tambah dokumen bersama fakultas"
        remah={[{ label: "Basis Pengetahuan fakultas", href: "/led/dokumen-bersama" }, { label: "Tambah dokumen" }]}
        kembali="/led/dokumen-bersama"
        catatan="Dokumen bersama dipakai semua LED fakultas (kode sumber U)."
      >
        <UnggahDokumenUmum pilihan={pilihan} url="/api/led/dokumen-bersama" kembaliKe="/led/dokumen-bersama" />
      </HalamanTambah>
    </ShellMenuLed>
  );
}
