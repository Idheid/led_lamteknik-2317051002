import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { prisma } from "@/modules/bersama/db";
import { modelEmbeddingAktif, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { jalankanJalur, jalankanUnsur, kueriUnsurSubBagian } from "@/modules/led/data/pencarian";
import { bacaCsvObjek, tulisCsv } from "@/modules/led/domain/csv";
import { KONFIGURASI_PENCARIAN, bacaDaftarKonfigurasi, konfigurasiAktif } from "@/modules/led/domain/konfigurasi-pencarian";
import {
  hitungRetrieval, kunciSubBagian, labelDariCsv, peringkatDariCsv, ringkasanCsvBaris, tabelMarkdown,
  type PeringkatKonfigurasi,
} from "@/modules/led/domain/metrik-retrieval";
import { urutanGabungan } from "@/modules/led/domain/pool-pencarian";
import { urutanSistemUnsur } from "@/modules/led/domain/kueri-unsur";

/**
 * Rencana 10 Nov T2: hitung precision@k dan recall@k dari CSV data uji yang sudah dilabel manusia.
 *
 *   npx tsx scripts/hitung-retrieval.ts --csv data-uji-berlabel.csv [--konfigurasi A-lama,B-bm25,C-unsur]
 *        [--k 1,3,5] [--keluaran folder] [--dari-csv]
 *
 * Bawaan: pencarian setiap sub-bagian dijalankan ulang dengan kueri tersimpan di CSV (butuh basis data dan kunci API
 * untuk embedding kueri). --dari-csv memakai peringkat yang tercatat saat ekspor, tanpa basis data.
 * k sistem tiap konfigurasi selalu ikut dihitung. Keluaran: ringkasan-retrieval.csv dan tabel-retrieval.md.
 */
const { values } = parseArgs({
  options: {
    csv: { type: "string" },
    konfigurasi: { type: "string" },
    k: { type: "string", default: "1,3,5" },
    keluaran: { type: "string", default: "hasil-retrieval" },
    "dari-csv": { type: "boolean", default: false },
  },
});

async function utama() {
  if (!values.csv) throw new Error("Pakai --csv <berkas CSV berlabel>.");
  const baris = bacaCsvObjek(readFileSync(resolve(values.csv), "utf8"));
  const konfigurasi = values.konfigurasi ? bacaDaftarKonfigurasi(values.konfigurasi) : konfigurasiAktif();
  const kSistem = Object.fromEntries(konfigurasi.map((k) => [k, KONFIGURASI_PENCARIAN[k].k]));
  const daftarK = [...values.k.split(",").map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x > 0), ...Object.values(kSistem)];
  const label = labelDariCsv(baris);

  let peringkat: PeringkatKonfigurasi;
  if (values["dari-csv"]) {
    peringkat = peringkatDariCsv(baris, konfigurasi);
  } else {
    const model = await modelEmbeddingAktif();
    const { penyedia } = await penyediaEmbedding();
    const vektor = new Map<string, Promise<number[]>>();
    const kelompok = new Map<string, { ledId: string; sub: string; kueri: string }>();
    for (const b of baris) kelompok.set(kunciSubBagian(b), { ledId: b.led_id, sub: b.sub_bagian, kueri: b.kueri });
    peringkat = Object.fromEntries(konfigurasi.map((k) => [k, {} as Record<string, string[]>]));
    for (const [kunci, g] of kelompok) {
      if (!vektor.has(g.kueri)) vektor.set(g.kueri, penyedia.embedKueri(g.kueri));
      for (const konf of konfigurasi) {
        if (KONFIGURASI_PENCARIAN[konf].kueri === "unsur") {
          const u = await jalankanUnsur({ proyekId: g.ledId, subBagianKode: g.sub, model }, await kueriUnsurSubBagian(g.ledId, g.sub), { k: KONFIGURASI_PENCARIAN[konf].k });
          peringkat[konf][kunci] = urutanSistemUnsur(u.pilih);
          continue;
        }
        const j = await jalankanJalur({ proyekId: g.ledId, subBagianKode: g.sub, model }, konf, g.kueri, 30, () => vektor.get(g.kueri)!);
        peringkat[konf][kunci] = urutanGabungan(j);
      }
    }
  }

  const hasil = hitungRetrieval(label, peringkat, daftarK);
  const folder = resolve(values.keluaran);
  mkdirSync(folder, { recursive: true });
  const r = ringkasanCsvBaris(hasil);
  writeFileSync(join(folder, "ringkasan-retrieval.csv"), "﻿" + tulisCsv(r.kepala, r.baris));
  const md = tabelMarkdown(hasil, kSistem);
  writeFileSync(join(folder, "tabel-retrieval.md"), md);
  console.log(md);
  console.log(`Keluaran: ${folder}`);
}

utama()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
