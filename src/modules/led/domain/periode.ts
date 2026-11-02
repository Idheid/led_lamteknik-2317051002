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
  if (k.hasilTercatat) return { tampilDiMenu: true, alasan: "Hasil akreditasi LED terakhir sudah dicatat." };
  if (k.statusReview === "layak") return { tampilDiMenu: true, alasan: "LED aktif sudah Layak diajukan." };
  if (k.eksporFinal) return { tampilDiMenu: true, alasan: "LED aktif sudah diekspor final." };
  if (k.ambang !== null) return { tampilDiMenu: true, alasan: `Akreditasi berakhir ${k.ambang} bulan lagi atau kurang.` };
  return { tampilDiMenu: false, alasan: "LED aktif belum selesai: belum Layak diajukan, belum diekspor final, dan akreditasi masih lebih dari 18 bulan." };
}

export function teksKonfirmasiPeriode(namaLama: string, versiBaru: string, sudahDiarsipkan = false): string {
  return sudahDiarsipkan
    ? `Bahan yang dipilih disalin dari ${namaLama} (sudah diarsipkan). LED baru memakai instrumen ${versiBaru}.`
    : `${namaLama} akan diarsipkan (tetap bisa dibuka dan diekspor). LED baru memakai instrumen ${versiBaru}.`;
}

// ------------------------------------------------------------------ L5: salin bahan dari LED lama

/** Kunci pembanding judul sub-bagian (sama seperti pemetaan instrumen): huruf kecil, tanpa tanda baca. */
function kunciJudul(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface BahanLama {
  kode: string;
  judul: string;
  isi: string;
}

export interface HasilPetaBahan {
  salin: { kode: string; isi: string; dariKode: string }[];
  /** bahan lama yang tidak punya padanan di instrumen LED baru (disalin manual oleh Tim Prodi) */
  belum: BahanLama[];
}

/**
 * Bahan dari prodi disalin per sub-bagian dengan kode yang sama; bila instrumen berganti, dicocokkan lewat judul
 * sub-bagian (hanya bila judulnya unik di instrumen baru). Teks diberi awalan "[dari LED {tahun}]" supaya diperbarui.
 */
export function petakanBahan(lama: BahanLama[], baru: { kode: string; judul: string }[], tahunLama: number): HasilPetaBahan {
  const kode = new Set(baru.map((s) => s.kode));
  const perJudul = new Map<string, string[]>();
  for (const s of baru) perJudul.set(kunciJudul(s.judul), [...(perJudul.get(kunciJudul(s.judul)) ?? []), s.kode]);
  const terpakai = new Set<string>();
  const hasil: HasilPetaBahan = { salin: [], belum: [] };
  for (const b of lama.filter((x) => x.isi.trim())) {
    const judul = perJudul.get(kunciJudul(b.judul));
    const tujuan = kode.has(b.kode) ? b.kode : judul?.length === 1 ? judul[0] : null;
    if (!tujuan || terpakai.has(tujuan)) {
      hasil.belum.push(b);
      continue;
    }
    terpakai.add(tujuan);
    hasil.salin.push({ kode: tujuan, dariKode: b.kode, isi: `[dari LED ${tahunLama}] ${b.isi.trim()}` });
  }
  return hasil;
}

/** Dokumen lebih tua dari 5 tahun (menurut tahun terbit) tidak dicentang secara bawaan. */
export function dokumenDicentangBawaan(tahunTerbit: number | null, tahunPengajuanBaru: number): boolean {
  return tahunTerbit === null || tahunPengajuanBaru - tahunTerbit <= 5;
}

/** Sub-bagian yang boleh memakai narasi periode lalu sebagai sumber P: evaluasi capaian (AF) dan perbaikan (SWOT). */
export function bolehSumberPeriodeLalu(kodeSub: string): boolean {
  return /-(AF|SWOT)$/.test(kodeSub);
}

/** Narasi lama yang padan untuk satu sub-bagian: kode sama, atau judul sama. */
export function cariNarasiLalu<T extends { kode: string; judul: string }>(daftar: T[], sub: { kode: string; judul: string }): T | null {
  return daftar.find((x) => x.kode === sub.kode) ?? daftar.find((x) => kunciJudul(x.judul) === kunciJudul(sub.judul)) ?? null;
}
