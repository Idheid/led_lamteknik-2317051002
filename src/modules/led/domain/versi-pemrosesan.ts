import { OPSI_POTONG } from './potong-teks.ts';
import { VERSI_KEPALA } from './kepala-potongan.ts';

/**
 * Rencana 10 Nov T9 (2): versi pemrosesan dokumen. Dokumen lain dengan hash berkas sama dan versi pemrosesan sama
 * boleh dipakai ulang potongan dan vektornya (tanpa ekstraksi ulang, OCR ulang, maupun embedding ulang). Bila salah satu
 * unsur berubah (aturan pemotongan, format kepala, versi OCR, model embedding), versinya berubah dan dokumen diproses penuh.
 */
export function versiPemrosesan(model: string, versiOcr: string, opsiPotong = OPSI_POTONG, versiKepala = VERSI_KEPALA): string {
  return [`potong:${opsiPotong.minimum}-${opsiPotong.maksimum}-${opsiPotong.tumpang}`, versiKepala, `ocr:${versiOcr}`, `embedding:${model}`].join('|');
}
