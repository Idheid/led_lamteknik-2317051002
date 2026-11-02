/**
 * Diimpor PERTAMA oleh setiap berkas uji integrasi: arahkan DATABASE_URL ke basis data uji sebelum modul
 * @/modules/bersama/db dimuat, matikan antrean (uji memanggil fungsi proses langsung), pakai embedding uji deterministik,
 * dan simpan unggahan di folder sementara.
 */
import "dotenv/config";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { urlDbUji } from "../../scripts/url-db-uji";

process.env.DATABASE_URL = urlDbUji();
process.env.ANTREAN_NONAKTIF = "1";
process.env.EMBEDDING_PENYEDIA = "uji";
// model tiruan di uji memakai doGenerate dan urutan panggilan tetap; uji aliran/paralel menyalakannya sendiri
process.env.GENERATE_STREAM = "0";
process.env.GENERATE_PARALEL = "1";
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), "led-uji-"));
