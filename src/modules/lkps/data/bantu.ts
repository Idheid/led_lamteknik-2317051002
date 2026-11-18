import { GalatAkses, GalatPengguna } from "@/modules/bersama/akses";
import { alamatBukti, kunciDariAlamat, uraiKunci } from "@/modules/lkps/domain/bukti";
import { barisBaru } from "@/modules/lkps/domain/validasi";

/** Pembantu lapisan data LKPS (Gabung LKPS G4). */

export const PESAN_BARIS_LAIN = "Baris ini milik program studi lain atau sudah dihapus.";

/**
 * Simpan satu baris dengan aturan kode asal (id kosong atau `temp_…` = baris baru), tetapi pengubahan memakai
 * `where: { id, prodiId }` (kode asal: `where: { id }` saja, masalah 10) dan prodi baris baru dari server.
 */
export async function simpanPerBaris<T>(
  id: string | undefined,
  langkah: { ubah: (id: string) => Promise<{ count: number }>; ambil: (id: string) => Promise<T | null>; buat: () => Promise<T> },
): Promise<T> {
  if (barisBaru(id)) return langkah.buat();
  const { count } = await langkah.ubah(id);
  if (count === 0) throw new GalatAkses(PESAN_BARIS_LAIN);
  const hasil = await langkah.ambil(id);
  if (!hasil) throw new GalatAkses(PESAN_BARIS_LAIN);
  return hasil;
}

/** Hapus satu baris milik prodi; `deleteMany({ where: { id, prodiId } })` mengembalikan count 0 bila bukan miliknya. */
export function pastikanTerhapus({ count }: { count: number }): void {
  if (count === 0) throw new GalatAkses(PESAN_BARIS_LAIN);
}

/**
 * Alamat bukti dari isi permintaan → kolom berkasLokasi/berkasNama. Hanya bukti yang diunggah ke prodi yang sama
 * yang boleh dirujuk (alamat luar atau bukti prodi lain ditolak). `undefined` = kolom tidak dikirim (tidak diubah).
 */
export function berkasDariAlamat(
  nilai: string | null | undefined,
  prodiId: string,
): { berkasLokasi: string | null; berkasNama: string | null } | undefined {
  if (nilai === undefined) return undefined;
  if (nilai === null) return { berkasLokasi: null, berkasNama: null };
  const kunci = kunciDariAlamat(nilai);
  const urai = kunci ? uraiKunci(kunci) : null;
  if (!kunci || !urai) throw new GalatPengguna("Alamat berkas bukti tidak dikenal. Unggah ulang berkasnya.");
  if (urai.prodiId !== prodiId) throw new GalatAkses("Berkas bukti ini milik program studi lain.");
  return { berkasLokasi: kunci, berkasNama: urai.nama };
}

/** Tambahkan kolom alamat bukti berbentuk kode asal (mis. `fileMou`) ke baris yang dikirim ke halaman. */
export function denganAlamat<T extends { berkasLokasi: string | null }, K extends string>(baris: T, kolom: K): T & Record<K, string | null> {
  return { ...baris, [kolom]: alamatBukti(baris.berkasLokasi) } as T & Record<K, string | null>;
}

/** Periksa semua alamat bukti di dalam JSON bebas (isian tabel dinamis): harus bukti prodi yang sama. */
export function periksaBuktiDalam(nilai: unknown, prodiId: string): void {
  if (typeof nilai === "string") {
    const t = nilai.trim();
    if (t.startsWith("/api/lkps/bukti") || /^lkps\//.test(t)) berkasDariAlamat(t, prodiId);
    return;
  }
  if (Array.isArray(nilai)) {
    for (const v of nilai) periksaBuktiDalam(v, prodiId);
    return;
  }
  if (nilai && typeof nilai === "object") for (const v of Object.values(nilai)) periksaBuktiDalam(v, prodiId);
}

/** Galat unik Prisma (P2002) → pesan yang aman ditampilkan. */
export function galatUnik(e: unknown, pesan: string): never {
  if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") throw new GalatPengguna(pesan);
  throw e;
}
