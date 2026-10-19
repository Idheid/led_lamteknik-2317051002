import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Pengguna } from "@/lib/akses";
import { imporInstrumen } from "@/lib/data/impor-instrumen";
import { buatAkunPenanggungJawab, simpanFakultas } from "@/lib/data/organisasi";

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

export async function buatSuperAdmin(email = "admin@uji.test"): Promise<Pengguna> {
  const { user } = await auth.api.createUser({
    body: { email, password: "SandiAdmin#123", name: "Admin Uji", role: "SUPER_ADMIN" },
  });
  return { id: user.id, nama: user.name, email: user.email, peran: "SUPER_ADMIN" };
}

/** Pengguna dari basis data (seperti yang dibaca sesi). */
export async function penggunaDari(userId: string): Promise<Pengguna> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { id: u.id, nama: u.name, email: u.email, peran: u.role };
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

/** Revisi 19 Okt 2026: satu akun PJ fakultas + identitas fakultas (pengganti UPPS). */
export async function siapkanPj(admin: Pengguna, email = "pj@uji.test", fakultas = { nama: "Fakultas Teknik", perguruanTinggi: "Universitas Contoh", alamat: "Jl. Contoh No. 1", kota: "" }): Promise<Pengguna> {
  const akun = await buatAkunPenanggungJawab(admin, { nama: "PJ Fakultas", email, kataSandi: "SandiPJ#123" });
  const pj = await penggunaDari(akun.id);
  await simpanFakultas(pj, fakultas);
  return pj;
}
