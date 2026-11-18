/**
 * Konfigurasi sinkron One Data (WS API myUnila), Gabung LKPS G6. Semua nilai hanya dari `.env`, tanpa nilai bawaan di
 * kode (kode asal Achmadghalib725/LKPS_LAM-TEKNIK@c718eff menyimpan nilai bawaan kredensial; tidak disalin). Nilai
 * variabel tidak pernah dicetak, dicatat di log, atau dikirim ke browser; yang boleh disebut hanya nama variabelnya.
 */

export const PESAN_ONEDATA_MATI = "Sinkron One Data belum diaktifkan";

export const VARIABEL_ONEDATA = ["MYUNILA_API_URL", "MYUNILA_APP_ID", "MYUNILA_USERNAME", "MYUNILA_PASSWORD"] as const;

export interface KonfigurasiOneData {
  url: string;
  appId: string;
  username: string;
  password: string;
}

export type StatusOneData = { aktif: true; konfigurasi: KonfigurasiOneData } | { aktif: false; kosong: string[] };

type Lingkungan = Record<string, string | undefined>;

/** Menyala hanya bila `LKPS_ONEDATA_AKTIF=true` dan keempat variabel MyUnila terisi; selainnya mati (bawaan). */
export function statusOneData(env: Lingkungan = process.env): StatusOneData {
  const nilai = (k: string) => (env[k] ?? "").trim();
  const kosong = VARIABEL_ONEDATA.filter((k) => !nilai(k));
  if (nilai("LKPS_ONEDATA_AKTIF").toLowerCase() !== "true") return { aktif: false, kosong: ["LKPS_ONEDATA_AKTIF", ...kosong] };
  if (kosong.length) return { aktif: false, kosong };
  return {
    aktif: true,
    konfigurasi: {
      url: nilai("MYUNILA_API_URL").replace(/\/+$/, ""),
      appId: nilai("MYUNILA_APP_ID"),
      username: nilai("MYUNILA_USERNAME"),
      password: nilai("MYUNILA_PASSWORD"),
    },
  };
}

/** Untuk halaman: hanya menyala/mati, tanpa nilai apa pun. */
export function oneDataAktif(env: Lingkungan = process.env): boolean {
  return statusOneData(env).aktif;
}
