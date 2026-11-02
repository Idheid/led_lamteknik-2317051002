import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { buatAdminPertama, perluAdminPertama } from "@/modules/bersama/data/pemasangan";
import { bersihkanDb, bisaLogin } from "./bantu";

/** Revisi 23 Okt 2026: admin pertama dibuat dari halaman login (tanpa .env); hanya sekali. */

before(async () => {
  await bersihkanDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("Admin pertama: hanya saat belum ada admin; instrumen bawaan ikut diimpor; percobaan kedua ditolak", async () => {
  assert.equal(await perluAdminPertama(), true);
  await assert.rejects(buatAdminPertama({ nama: "A", email: "bukan-email", kataSandi: "SandiKuat#1" }));
  await buatAdminPertama({ nama: "Admin Fakultas", email: "Admin@Fakultas.test", kataSandi: "SandiKuat#1" });
  assert.equal(await perluAdminPertama(), false);
  const u = await prisma.user.findUniqueOrThrow({ where: { email: "admin@fakultas.test" } });
  assert.equal(u.role, "ADMIN");
  assert.ok(await bisaLogin("admin@fakultas.test", "SandiKuat#1"));
  assert.ok((await prisma.versiInstrumen.count()) > 0, "instrumen bawaan tersedia");
  assert.equal(await prisma.prodi.count(), 16, "16 prodi FT Unila terisi saat pemasangan pertama (revisi 31 Okt 2026)");
  assert.equal((await prisma.fakultas.findUniqueOrThrow({ where: { id: "utama" } })).perguruanTinggi, "Universitas Lampung");
  await assert.rejects(buatAdminPertama({ nama: "Penyusup", email: "lain@fakultas.test", kataSandi: "SandiKuat#2" }), /Admin sudah ada/);
  assert.equal(await prisma.user.count({ where: { role: "ADMIN" } }), 1);
});
