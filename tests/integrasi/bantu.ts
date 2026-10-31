import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import { auth } from "@/modules/bersama/auth";
import type { Pengguna } from "@/modules/bersama/akses";
import { imporInstrumen } from "@/modules/led/data/impor-instrumen";
import { buatAkunTimProdi, simpanFakultas, simpanProdi } from "@/modules/bersama/data/organisasi";
import type { MasukanProdi } from "@/modules/bersama/validasi";

/** Kosongkan semua tabel aplikasi (kecuali riwayat migrasi). */
export async function bersihkanDb(): Promise<void> {
  const tabel = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tabel.length === 0) return;
  const daftar = tabel.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${daftar} RESTART IDENTITY CASCADE`);
}

export function bacaSeed(): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json"), "utf8"));
}

export async function imporSeed() {
  return imporInstrumen(prisma, bacaSeed());
}

/** Admin UPPS (revisi 31 Okt 2026). */
export async function buatAdmin(email = "admin@uji.test"): Promise<Pengguna> {
  const { user } = await auth.api.createUser({
    body: { email, password: "SandiAdmin#123", name: "Admin Uji", role: "ADMIN" },
  });
  return { id: user.id, nama: user.name, email: user.email, peran: "ADMIN", prodiId: null };
}

/** Pengguna dari basis data (seperti yang dibaca sesi). */
export async function penggunaDari(userId: string): Promise<Pengguna> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { id: u.id, nama: u.name, email: u.email, peran: u.role, prodiId: u.prodiId };
}

/** Login lewat Better Auth; mengembalikan true bila berhasil. */
export async function bisaLogin(email: string, password: string): Promise<boolean> {
  try {
    const r = await auth.api.signInEmail({ body: { email, password } });
    return Boolean(r.user);
  } catch {
    return false;
  }
}

export const FAKULTAS_UJI = { nama: "Fakultas Teknik", perguruanTinggi: "Universitas Contoh", alamat: "Jl. Contoh No. 1", kota: "" };

/** Identitas fakultas diisi Admin UPPS. */
export async function siapkanFakultas(admin: Pengguna, fakultas = FAKULTAS_UJI): Promise<void> {
  await simpanFakultas(admin, fakultas);
}

/** Akun Tim Prodi untuk satu prodi (dibuat Admin UPPS). */
export async function buatTimProdi(admin: Pengguna, prodiId: string, email = `tim.${prodiId}@uji.test`, nama = "Tim Prodi Uji"): Promise<Pengguna> {
  const akun = await buatAkunTimProdi(admin, { nama, email, kataSandi: "SandiTim#123", prodiId });
  return penggunaDari(akun.id);
}

/** Revisi 31 Okt 2026: prodi baru (oleh Admin UPPS) beserta satu akun Tim Prodinya. */
export async function siapkanProdi(admin: Pengguna, masukan: MasukanProdi, email?: string) {
  const prodi = await simpanProdi(admin, masukan);
  const tim = await buatTimProdi(admin, prodi.id, email);
  return { prodi, tim };
}
