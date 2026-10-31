/**
 * Seed: Admin UPPS pertama (dari .env) dan instrumen LAM Teknik 2025 (idempoten).
 * Jalankan: npm run db:seed
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import { auth } from "@/modules/bersama/auth";
import { imporInstrumen } from "@/modules/led/data/impor-instrumen";

async function seedAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAMA?.trim() || "Admin UPPS";
  if (!email || !password) throw new Error("SUPERADMIN_EMAIL dan SUPERADMIN_PASSWORD wajib diisi di .env");
  const ada = await prisma.user.findUnique({ where: { email } });
  if (ada) {
    if (ada.role !== "ADMIN") await prisma.user.update({ where: { id: ada.id }, data: { role: "ADMIN", prodiId: null } });
    console.log(`Admin UPPS sudah ada: ${email}`);
    return;
  }
  await auth.api.createUser({ body: { email, password, name, role: "ADMIN" } });
  console.log(`Admin UPPS dibuat: ${email}`);
}

async function seedInstrumen() {
  const berkas = resolve(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json");
  const hasil = await imporInstrumen(prisma, JSON.parse(readFileSync(berkas, "utf8")));
  console.log(hasil.dibuat ? `Instrumen ${hasil.kode} diimpor.` : `Instrumen ${hasil.kode} sudah ada, dilewati.`);
}

async function main() {
  await seedAdmin();
  await seedInstrumen();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
