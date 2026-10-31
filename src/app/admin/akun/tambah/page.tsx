import type { Metadata } from "next";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { daftarProdi } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormTambahAkun } from "../komponen";

export const metadata: Metadata = { title: "Tambah akun" };

/** Perbaikan 1 Nov 2026 (P2): Tambah akun di halaman sendiri, sama seperti Tambah kunci dan Tambah prodi. */
export default async function HalamanTambahAkun() {
  const p = await wajibAdmin();
  const prodi = (await daftarProdi(p)).map((x) => ({ id: x.id, label: `${namaJenjang(x.jenjang)} ${x.nama}` }));
  return (
    <HalamanTambah
      judul="Tambah akun"
      remah={[{ label: "Kelola akun", href: "/admin/akun" }, { label: "Tambah akun" }]}
      kembali="/admin/akun"
      catatan="Pilih peran, lalu isi nama, email, dan kata sandi awal. Pemilik akun wajib mengganti kata sandi saat login pertama. Akun Tim Prodi wajib memilih program studi; satu prodi boleh beberapa akun."
    >
      <FormTambahAkun prodi={prodi} />
    </HalamanTambah>
  );
}
