/**
 * Rencana 10 Nov T10 (R2): hasil butir angka Sarjana identik dengan snapshot yang dibuat sebelum refaktor
 * (scripts/snapshot-rumus-sarjana.ts, fikstur tests/fikstur/lkps-contoh-s1.xlsx, TS 2024 dan 2025).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bacaLkpsXlsx } from "@/modules/led/data-lkps/baca-xlsx";
import { hitungSemua } from "@/modules/led/domain/metrik-lkps";

test("butir angka Sarjana identik dengan snapshot sebelum refaktor", async () => {
  const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), "tests/fikstur/rumus/regresi-sarjana.json"), "utf8"));
  const h = await bacaLkpsXlsx(readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")), "S1");
  for (const s of snapshot) {
    const kini = JSON.parse(JSON.stringify(hitungSemua(h.tabel, { tsTahunMulai: s.tsTahunMulai })));
    assert.deepEqual(kini, s.butir, `TS ${s.tsTahunMulai}`);
  }
});
