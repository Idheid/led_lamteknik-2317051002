import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { akhiranKunci, dekripsi, enkripsi } from "@/lib/kripto";
import { embeddingHash, literalVektor } from "@/lib/llm/embedding";
import { kueriKataKunci } from "@/lib/domain/rrf";

// kunci induk dibaca saat fungsi dipanggil, jadi cukup diisi sebelum uji berjalan
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("kunci API dienkripsi AES-256-GCM dan bisa didekripsi kembali", () => {
  const asli = "AIzaSyContohKunciPalsu1234567890xyz";
  const a = enkripsi(asli);
  const b = enkripsi(asli);
  assert.notEqual(a, b, "IV acak: hasil enkripsi berbeda tiap kali");
  assert.ok(!a.includes(asli));
  assert.equal(dekripsi(a), asli);
  assert.equal(akhiranKunci(asli), "0xyz".slice(-4));
});

test("data terenkripsi yang diubah ditolak (tag autentikasi GCM)", () => {
  const s = enkripsi("rahasia").split(":");
  const data = Buffer.from(s[3], "base64");
  data[0] ^= 1;
  s[3] = data.toString("base64");
  assert.throws(() => dekripsi(s.join(":")));
  assert.throws(() => dekripsi("bukan-format"));
});

test("embedding uji deterministik, 768 dimensi, ternormalkan; literal pgvector", () => {
  const v = embeddingHash("tracer study lulusan");
  assert.equal(v.length, 768);
  assert.deepEqual(v, embeddingHash("tracer study lulusan"));
  assert.ok(Math.abs(Math.sqrt(v.reduce((s, x) => s + x * x, 0)) - 1) < 1e-9);
  assert.match(literalVektor(v), /^\[-?\d/);
  assert.throws(() => literalVektor([1, 2, 3]));
});

test("kueri kata kunci aman untuk to_tsquery", () => {
  assert.equal(kueriKataKunci("Tracer study: lulusan & ' OR 1=1 --"), "tracer | study | lulusan | or");
  assert.equal(kueriKataKunci("!!!"), null);
});
