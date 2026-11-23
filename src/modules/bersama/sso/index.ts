import type { KonfigurasiSso } from "./konfigurasi";
import type { PenyediaSso } from "./penyedia";
import { penyediaAkses } from "./akses";
import { penyediaTiruan } from "./tiruan";

/** Penyedia sesuai `SSO_MODE`. */
export function penyediaSso(k: Pick<KonfigurasiSso, "mode">): PenyediaSso {
  return k.mode === "tiruan" ? penyediaTiruan : penyediaAkses;
}
