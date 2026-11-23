import { GalatSso, type PenyediaSso } from "./penyedia";

/**
 * Penyedia API Access (Manajemen Akses Unila). Rencana 18 Nov S5: nama parameter, cara validasi, dan pemetaan atribut
 * diambil HANYA dari docs/SSO-AKSES-CATATAN.md. Berkas itu belum berisi jawaban (23 Nov 2026), jadi penyedia ini belum
 * dikonfigurasi dan tidak menebak apa pun. Semua pekerjaan lain diuji dengan penyedia tiruan.
 */
const BELUM = "Penyedia Access belum dikonfigurasi";

export const penyediaAkses: PenyediaSso = {
  urlMasuk() {
    throw new GalatSso(BELUM);
  },
  async bacaHasil() {
    throw new GalatSso(BELUM);
  },
  urlKeluar() {
    throw new GalatSso(BELUM);
  },
};
