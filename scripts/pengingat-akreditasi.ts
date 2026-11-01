import "dotenv/config";
import { prisma } from "@/modules/bersama/db";
import { kirimPengingatAkreditasi } from "@/modules/bersama/data/pengingat-akreditasi";

/** Jalankan pekerjaan harian pengingat akreditasi sekali secara manual (L2): npm run pengingat */
kirimPengingatAkreditasi()
  .then((n) => console.log(`${n} prodi diingatkan.`))
  .finally(() => prisma.$disconnect());
