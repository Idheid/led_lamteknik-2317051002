/**
 * Seed: super admin pertama (dari .env) dan instrumen LAM Teknik 2025 (idempoten).
 * Jalankan: npm run db:seed
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { imporInstrumen } from "@/lib/data/impor-instrumen";

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAMA?.trim() || "Super Admin";
  if (!email || !password) throw new Error("SUPERADMIN_EMAIL dan SUPERADMIN_PASSWORD wajib diisi di .env");
  const ada = await prisma.user.findUnique({ where: { email } });
  if (ada) {
    if (ada.role !== "SUPER_ADMIN") await prisma.user.update({ where: { id: ada.id }, data: { role: "SUPER_ADMIN" } });
    console.log(`Super admin sudah ada: ${email}`);
    return;
  }
  await auth.api.createUser({ body: { email, password, name, role: "SUPER_ADMIN" } });
  console.log(`Super admin dibuat: ${email}`);
}

async function seedInstrumen() {
  const berkas = resolve(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json");
  const hasil = await imporInstrumen(prisma, JSON.parse(readFileSync(berkas, "utf8")));
  console.log(hasil.dibuat ? `Instrumen ${hasil.kode} diimpor.` : `Instrumen ${hasil.kode} sudah ada, dilewati.`);
}

async function main() {
  await seedSuperAdmin();
  await seedInstrumen();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
