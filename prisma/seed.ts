/**
 * Seed: Admin UPPS pertama (dari .env), instrumen LAM Teknik 2025, dan 16 prodi FT Unila (semuanya idempoten).
 * Jalankan: npm run db:seed
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import { auth } from "@/modules/bersama/auth";
import { imporInstrumen } from "@/modules/led/data/impor-instrumen";
import { isiProdiBawaan } from "@/modules/bersama/data/prodi-bawaan";

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
  // revisi 31 Okt 2026: daftar prodi FT Unila sudah terisi; prodi yang ada tidak ditimpa
  const prodi = await isiProdiBawaan();
  console.log(`Prodi bawaan: ${prodi.dibuat} ditambahkan, ${prodi.dilewati} sudah ada.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
