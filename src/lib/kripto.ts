import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Enkripsi kunci API LLM: AES-256-GCM dengan kunci dari ENCRYPTION_KEY (32 byte, base64).
 * Format tersimpan: "v1:<iv>:<tag>:<data>" (base64). Hanya dipakai di server/worker.
 */

function kunciInduk(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY;
  if (!b64) throw new Error("ENCRYPTION_KEY belum diisi di .env");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY harus 32 byte (base64)");
  return k;
}

export function enkripsi(teks: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", kunciInduk(), iv);
  const data = Buffer.concat([c.update(teks, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function dekripsi(sandi: string): string {
  const [v, iv, tag, data] = sandi.split(":");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Format kunci terenkripsi tidak dikenal");
  const d = createDecipheriv("aes-256-gcm", kunciInduk(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}

/** Empat karakter terakhir untuk tampilan ("…a1B2"). */
export function akhiranKunci(kunci: string): string {
  return kunci.trim().slice(-4);
}
