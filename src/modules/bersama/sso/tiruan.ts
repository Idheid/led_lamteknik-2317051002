import { createHmac, timingSafeEqual } from "node:crypto";
import { GalatSso, type HasilSso, type PenyediaSso } from "./penyedia";

/**
 * Penyedia SSO tiruan (Rencana 18 Nov S5) untuk pengembangan dan uji, bukan untuk produksi (`konfigurasiSso` menolak
 * `SSO_MODE=tiruan` bila `NODE_ENV=production`, dan rute `/api/sso/tiruan` mati di produksi).
 *
 * Halaman `/api/sso/tiruan` menampilkan pengguna palsu. Pilihan dikirim ke `/api/sso/kembali` sebagai `tiket` bertanda
 * HMAC (kunci `BETTER_AUTH_SECRET`, berlaku 2 menit), meniru validasi kiriman oleh server penyedia: tiket yang diubah,
 * kedaluwarsa, atau dibuat tanpa kunci ditolak.
 */

export const PERSONA_TIRUAN = {
  "dosen-terdaftar": {
    judul: "Dosen terdaftar",
    keterangan: "UNILA ID dosen.tiruan. Agar cocok, isi UNILA ID \"dosen.tiruan\" pada satu akun di Kelola akun.",
    hasil: { username: "dosen.tiruan", nama: "Dosen Tiruan Terdaftar", email: "dosen.tiruan@unila.ac.id", aktif: true, status: "dosen" },
  },
  "dosen-baru": {
    judul: "Dosen belum terdaftar",
    keterangan: "Belum punya akun: masuk sebagai Tamu, Admin UPPS mendapat pemberitahuan.",
    hasil: { username: "dosen.baru.tiruan", nama: "Dosen Tiruan Baru", email: "dosen.baru.tiruan@unila.ac.id", aktif: true, status: "dosen" },
  },
  mahasiswa: {
    judul: "Mahasiswa",
    keterangan: "Ditolak; tidak ada akun yang dibuat.",
    hasil: { username: "2115061999", nama: "Mahasiswa Tiruan", email: "2115061999@students.unila.ac.id", aktif: true, status: "mahasiswa" },
  },
  nonaktif: {
    judul: "Akun SSO nonaktif",
    keterangan: "Akun SSO tidak aktif di Unila; ditolak.",
    hasil: { username: "tendik.nonaktif.tiruan", nama: "Tendik Tiruan Nonaktif", email: "tendik.nonaktif.tiruan@unila.ac.id", aktif: false, status: "tendik" },
  },
} as const satisfies Record<string, { judul: string; keterangan: string; hasil: HasilSso }>;

export type KunciPersona = keyof typeof PERSONA_TIRUAN;

const LAMA_TIKET_MS = 2 * 60_000;

function kunciRahasia(): string {
  const k = process.env.BETTER_AUTH_SECRET;
  if (!k) throw new GalatSso("BETTER_AUTH_SECRET belum diisi.");
  return k;
}

function tanda(isi: string): string {
  return createHmac("sha256", kunciRahasia()).update(`sso-tiruan:${isi}`).digest("base64url");
}

/** Tiket bertanda untuk satu hasil SSO tiruan. */
export function buatTiketTiruan(hasil: HasilSso, sekarang = Date.now()): string {
  const isi = Buffer.from(JSON.stringify({ h: hasil, k: sekarang + LAMA_TIKET_MS })).toString("base64url");
  return `${isi}.${tanda(isi)}`;
}

/** Periksa tanda dan masa berlaku tiket; galat bila tidak sah. */
export function bacaTiketTiruan(tiket: string, sekarang = Date.now()): HasilSso {
  const [isi, ttd, lebih] = tiket.split(".");
  if (!isi || !ttd || lebih !== undefined) throw new GalatSso("Tiket tiruan tidak sah.");
  const a = Buffer.from(ttd);
  const b = Buffer.from(tanda(isi));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new GalatSso("Tanda tiket tiruan salah.");
  const data = JSON.parse(Buffer.from(isi, "base64url").toString("utf8")) as { h: HasilSso; k: number };
  if (typeof data.k !== "number" || data.k < sekarang) throw new GalatSso("Tiket tiruan kedaluwarsa.");
  const h = data.h;
  if (typeof h?.username !== "string" || !h.username.trim() || typeof h.nama !== "string") throw new GalatSso("Isi tiket tiruan tidak lengkap.");
  return {
    username: h.username.trim().toLowerCase(),
    nama: h.nama.trim() || h.username,
    email: typeof h.email === "string" && h.email.trim() ? h.email.trim().toLowerCase() : null,
    aktif: h.aktif === true,
    status: typeof h.status === "string" && h.status.trim() ? h.status.trim().toLowerCase() : null,
  };
}

async function bacaIsian(permintaan: Request): Promise<URLSearchParams> {
  if (permintaan.method === "POST") {
    const f = await permintaan.formData();
    const p = new URLSearchParams();
    for (const [k, v] of f) if (typeof v === "string") p.set(k, v);
    return p;
  }
  return new URL(permintaan.url).searchParams;
}

export const penyediaTiruan: PenyediaSso = {
  urlMasuk: (state) => `/api/sso/tiruan?state=${encodeURIComponent(state)}`,
  async bacaHasil(permintaan) {
    const isian = await bacaIsian(permintaan);
    const tiket = isian.get("tiket");
    if (!tiket) throw new GalatSso("Tiket tiruan tidak ada.");
    return { hasil: bacaTiketTiruan(tiket), state: isian.get("state") };
  },
  // S6 mengisi halaman keluar tiruan; sementara langsung kembali
  urlKeluar: (kembaliKe) => kembaliKe,
};
