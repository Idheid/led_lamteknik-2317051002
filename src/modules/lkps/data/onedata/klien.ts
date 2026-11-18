import type { KonfigurasiOneData } from "@/modules/lkps/data/onedata/konfigurasi";

/**
 * Klien WS API myUnila (Gabung LKPS G6), ditulis ulang dari struktur `src/lib/myunila-client.ts` kode asal
 * (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff, Achmad Ghalib): login `POST /v1/auth/login` (`id_aplikasi`, `username`,
 * `password`) → `data.access_token` + `data.expires_in`, lalu `GET` dengan `Authorization: Bearer`.
 *
 * Perbedaan:
 * - kredensial dari konfigurasi `.env` saja (tanpa nilai bawaan);
 * - token hanya di memori server, tidak pernah dikirim ke browser, dicatat di log, atau dimasukkan ke pesan galat;
 *   pesan galat hanya memuat kode status (kode asal menyertakan isi respons);
 * - token tersimpan dicek ulang lewat `GET /v1/auth/check-token` paling lambat setiap 5 menit (arahan bimbingan ke-8);
 *   bila tidak sah, login ulang. Bentuk respons check-token belum diketahui: dianggap sah bila status 2xx.
 */

interface TokenTersimpan {
  token: string;
  kedaluwarsa: number;
  dicekPada: number;
}

let tersimpan: TokenTersimpan | null = null;

const SELANG_CEK_MS = 5 * 60_000;
const SISA_MINIMUM_MS = 60_000;

/** Untuk uji: lupakan token tersimpan. */
export function lupakanTokenOneData(): void {
  tersimpan = null;
}

async function login(k: KonfigurasiOneData, sekarang: number): Promise<TokenTersimpan> {
  const res = await fetch(`${k.url}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ id_aplikasi: k.appId, username: k.username, password: k.password }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Login One Data gagal (status ${res.status}).`);
  const json = (await res.json().catch(() => null)) as { data?: { access_token?: unknown; expires_in?: unknown } } | null;
  const token = json?.data?.access_token;
  if (typeof token !== "string" || !token) throw new Error("Login One Data tidak mengembalikan token.");
  const detik = Number(json?.data?.expires_in) > 0 ? Number(json?.data?.expires_in) : 3600;
  return { token, kedaluwarsa: sekarang + detik * 1000, dicekPada: sekarang };
}

async function tokenSah(k: KonfigurasiOneData, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${k.url}/v1/auth/check-token`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Token aktif: dipakai ulang selama belum kedaluwarsa dan masih sah menurut check-token; selainnya login sekali. */
export async function tokenOneData(k: KonfigurasiOneData, sekarang = Date.now()): Promise<string> {
  if (tersimpan && tersimpan.kedaluwarsa > sekarang + SISA_MINIMUM_MS) {
    if (sekarang - tersimpan.dicekPada < SELANG_CEK_MS) return tersimpan.token;
    if (await tokenSah(k, tersimpan.token)) {
      tersimpan.dicekPada = sekarang;
      return tersimpan.token;
    }
  }
  tersimpan = null;
  tersimpan = await login(k, sekarang);
  return tersimpan.token;
}

/** GET endpoint One Data, mis. `/v1/sdm/penugasan_sdm`, dengan parameter kueri; mengembalikan JSON. */
export async function ambilOneData(k: KonfigurasiOneData, endpoint: string, params: Record<string, string | number | null | undefined> = {}): Promise<unknown> {
  const token = await tokenOneData(k);
  const kueri = new URLSearchParams();
  for (const [kunci, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") kueri.append(kunci, String(v));
  const res = await fetch(`${k.url}${endpoint}${kueri.size ? `?${kueri}` : ""}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) lupakanTokenOneData();
  if (!res.ok) throw new Error(`Permintaan One Data ${endpoint} gagal (status ${res.status}).`);
  return res.json();
}
