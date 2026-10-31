import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auth } from "@/modules/bersama/auth";
import { prisma } from "@/modules/bersama/db";
import { GalatPengguna } from "@/modules/bersama/akses";
import { imporInstrumen } from "@/modules/led/data/impor-instrumen";
import { skemaAkunSuperAdmin, type MasukanAkunSuperAdmin } from "@/modules/bersama/validasi";

/**
 * Pemasangan pertama tanpa .env (revisi 23 Okt 2026): selama belum ada admin, halaman login menampilkan formulir
 * "Buat akun admin pertama". Setelah satu admin ada, formulir itu hilang; akun lain dibuat admin di Kelola akun.
 */
export async function perluAdminPertama(): Promise<boolean> {
  return (await prisma.user.count({ where: { role: "SUPER_ADMIN" } })) === 0;
}

export async function buatAdminPertama(masukan: MasukanAkunSuperAdmin) {
  const data = skemaAkunSuperAdmin.parse(masukan);
  if (!(await perluAdminPertama())) throw new GalatPengguna("Admin sudah ada. Masuk dengan akun admin, atau minta admin membuatkan akun.");
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw new GalatPengguna(`Email ${data.email} sudah dipakai.`);
  await auth.api.createUser({ body: { email: data.email, password: data.kataSandi, name: data.nama, role: "SUPER_ADMIN" } });
  // instrumen bawaan (seed) supaya kerangka LED tersedia sejak awal; idempoten
  if ((await prisma.versiInstrumen.count()) === 0) {
    await imporInstrumen(prisma, JSON.parse(readFileSync(resolve(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json"), "utf8")));
  }
}
