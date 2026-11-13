/**
 * Rencana 10 Nov T9 (8): jumlah sub-bagian yang dikerjakan bersamaan menyesuaikan batas per menit Gemini.
 * - mulai dari `awal` (GENERATE_PARALEL, bawaan 2);
 * - naik 1 (sampai `maks`, GENERATE_PARALEL_MAKS bawaan 4) setiap 20 panggilan berhasil berturut-turut tanpa 429;
 * - turun ke separuh (paling sedikit 1) setiap ada 429 batas per menit.
 * Jeda `retryDelay` dari Google tetap dihormati di llm-narasi; pengatur ini hanya mengatur berapa yang dikirim bersamaan.
 */
export const AMBANG_NAIK = 20;

export class PengaturParalel {
  private kini: number;
  private tanpa429 = 0;

  constructor(private readonly awal: number, private readonly maks: number) {
    this.kini = Math.max(1, Math.min(awal, maks));
  }

  get nilai(): number {
    return this.kini;
  }

  berhasil(n = 1): void {
    this.tanpa429 += n;
    while (this.tanpa429 >= AMBANG_NAIK) {
      this.tanpa429 -= AMBANG_NAIK;
      if (this.kini < this.maks) this.kini += 1;
    }
  }

  kena429(): void {
    this.tanpa429 = 0;
    this.kini = Math.max(1, Math.floor(this.kini / 2));
  }

  /** kembali ke nilai awal (uji) */
  setel(): void {
    this.kini = Math.max(1, Math.min(this.awal, this.maks));
    this.tanpa429 = 0;
  }
}
