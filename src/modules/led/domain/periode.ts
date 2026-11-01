/**
 * LED periode berikutnya (L4, 2 Nov 2026), logika murni. Tombol "Mulai LED periode berikutnya" selalu terlihat di
 * Menu LED bila prodi punya LED aktif dan salah satu syarat terpenuhi; selain itu tombolnya tetap ada di Pengaturan LED
 * dengan peringatan bahwa LED aktif belum selesai.
 */

export interface KeadaanPeriode {
  /** ambang pengingat yang sudah tercapai (≤ 18 bulan sebelum akreditasi berakhir), null bila belum */
  ambang: number | null;
  /** hasil akreditasi LED aktif sudah dicatat (menunggu konfirmasi atau berlaku) */
  hasilTercatat: boolean;
  statusReview: string;
  eksporFinal: boolean;
}

export function syaratPeriodeBerikutnya(k: KeadaanPeriode): { tampilDiMenu: boolean; alasan: string } {
  if (k.hasilTercatat) return { tampilDiMenu: true, alasan: "Hasil akreditasi LED aktif sudah dicatat." };
  if (k.statusReview === "layak") return { tampilDiMenu: true, alasan: "LED aktif sudah Layak diajukan." };
  if (k.eksporFinal) return { tampilDiMenu: true, alasan: "LED aktif sudah diekspor final." };
  if (k.ambang !== null) return { tampilDiMenu: true, alasan: `Akreditasi berakhir ${k.ambang} bulan lagi atau kurang.` };
  return { tampilDiMenu: false, alasan: "LED aktif belum selesai: belum Layak diajukan, belum diekspor final, dan akreditasi masih lebih dari 18 bulan." };
}

export function teksKonfirmasiPeriode(namaLama: string, versiBaru: string): string {
  return `${namaLama} akan diarsipkan (tetap bisa dibuka dan diekspor). LED baru memakai instrumen ${versiBaru}.`;
}
