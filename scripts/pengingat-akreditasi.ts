import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "@/modules/bersama/db";
import { kirimPengingatAkreditasi } from "@/modules/bersama/data/pengingat-akreditasi";

/**
 * Jalankan pekerjaan harian pengingat akreditasi sekali secara manual (L2): npm run pengingat
 * Untuk uji: --tanggal 2030-06-01 (hari simulasi) dan --prodi <id> (hanya satu prodi).
 */
const { values } = parseArgs({ options: { tanggal: { type: "string" }, prodi: { type: "string" } } });
const hariIni = values.tanggal ? new Date(`${values.tanggal}T00:00:00.000Z`) : new Date();
kirimPengingatAkreditasi(hariIni, { prodiId: values.prodi })
  .then((n) => console.log(`${n} prodi diingatkan.`))
  .finally(() => prisma.$disconnect());
