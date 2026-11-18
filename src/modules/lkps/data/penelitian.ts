import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaId, skemaPenelitian } from "@/modules/lkps/domain/validasi";
import { pastikanTerhapus, simpanPerBaris } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/penelitian/route.ts dan
// src/app/api/pkm/route.ts (dua rute, satu tabel PenelitianDosen dibedakan kolom `jenis`).
// Gabung LKPS G4: satu lapisan data untuk keduanya; jenis ditentukan rute, bukan isi permintaan; tahun wajib.

export type JenisPenelitian = "Penelitian" | "PkM";

function jenisSah(jenis: unknown): JenisPenelitian {
  return jenis === "PkM" ? "PkM" : "Penelitian";
}

/** Kriteria 6 (Penelitian) atau 7 (PkM): array baris, tahun terbaru dulu. */
export async function bacaPenelitianDosen(p: Pengguna, prodiId: string, jenis: JenisPenelitian) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  return prisma.lkpsPenelitianDosen.findMany({ where: { prodiId, jenis: jenisSah(jenis) }, orderBy: { tahun: "desc" } });
}

/** Aksi `save`. */
export async function simpanPenelitianDosen(p: Pengguna, prodiId: string, jenis: JenisPenelitian, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const j = jenisSah(jenis);
  const { id, ...data } = skemaPenelitian.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsPenelitianDosen.updateMany({ where: { id: i, prodiId, jenis: j }, data }),
    ambil: (i) => prisma.lkpsPenelitianDosen.findFirst({ where: { id: i, prodiId, jenis: j } }),
    buat: () => prisma.lkpsPenelitianDosen.create({ data: { ...data, jenis: j, prodiId } }),
  });
}

/** Aksi `delete`. */
export async function hapusPenelitianDosen(p: Pengguna, prodiId: string, jenis: JenisPenelitian, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsPenelitianDosen.deleteMany({ where: { id, prodiId, jenis: jenisSah(jenis) } }));
  return { success: true };
}
