/**
 * Daftar penyimpan otomatis yang aktif di halaman (jawaban penyusun, editor narasi, nilai manual).
 * Tombol Sebelumnya/Berikutnya memanggil simpanSemuaTertunda() sebelum pindah halaman supaya ketikan
 * yang masih menunggu jeda simpan otomatis tidak hilang. Hanya dipakai di komponen klien.
 */

type Penyimpan = () => Promise<boolean>;

const penyimpan = new Set<Penyimpan>();

/** Daftarkan fungsi yang menyimpan perubahan tertunda; kembalikan fungsi untuk melepas pendaftaran. */
export function daftarkanPenyimpan(fn: Penyimpan): () => void {
  penyimpan.add(fn);
  return () => {
    penyimpan.delete(fn);
  };
}

/** Simpan semua perubahan tertunda. Bernilai false bila ada yang gagal disimpan. */
export async function simpanSemuaTertunda(): Promise<boolean> {
  const hasil = await Promise.allSettled([...penyimpan].map((fn) => fn()));
  return hasil.every((h) => h.status === "fulfilled" && h.value);
}
