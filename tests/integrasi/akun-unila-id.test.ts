import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/modules/bersama/db";
import { GalatPengguna } from "@/modules/bersama/akses";
import {
  aturUlangKataSandi, buatAkunAsesor, buatAkunTimProdi, daftarAkun, gantiKataSandiSendiri, simpanProdi, ubahIdentitasAkun,
  ubahPeranAkun,
} from "@/modules/bersama/data/organisasi";
import { PENYEDIA_SSO, caraMasukAkun, labelCaraMasuk } from "@/modules/bersama/sso/penyedia";
import { saringAkun } from "@/app/admin/akun/saring";
import { bersihkanDb, buatAdmin, imporSeed, penggunaDari, siapkanFakultas } from "./bantu";

/** Rencana 18 Nov S4: UNILA ID di akun, kolom "Cara masuk", penyaring "Tamu baru", dan akun tanpa kata sandi. */

before(async () => {
  await bersihkanDb();
  await imporSeed();
});
after(() => prisma.$disconnect());

/** Akun Tamu seperti hasil login SSO (S5): hanya `Account` sso-unila, tanpa kredensial sandi. */
async function buatTamuSso(nama: string, email: string, usernameSso: string, dibuat: Date) {
  return prisma.user.create({
    data: {
      id: randomUUID(), name: nama, email, emailVerified: true, role: "TAMU", usernameSso, createdAt: dibuat,
      accounts: { create: { id: randomUUID(), accountId: usernameSso, providerId: PENYEDIA_SSO } },
    },
  });
}

test("S4: UNILA ID dipangkas, huruf kecil, unik; kosong disimpan null; nilainya tidak masuk log", async () => {
  const admin = await buatAdmin();
  const a = await buatAkunAsesor(admin, { nama: "Reviewer Satu", email: "reviewer1@uji.test", kataSandi: "SandiRev#123", usernameSso: "  Budi.Santoso " });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: a.id } })).usernameSso, "budi.santoso");

  // sama dengan beda huruf besar/kecil → ditolak, akun tidak dibuat
  await assert.rejects(
    buatAkunAsesor(admin, { nama: "Reviewer Dua", email: "reviewer2@uji.test", kataSandi: "SandiRev#123", usernameSso: "BUDI.SANTOSO" }),
    (e) => e instanceof GalatPengguna && /UNILA ID ini sudah dipakai/.test(e.message),
  );
  assert.equal(await prisma.user.count({ where: { email: "reviewer2@uji.test" } }), 0);
  await assert.rejects(
    buatAkunAsesor(admin, { nama: "Reviewer Dua", email: "reviewer2@uji.test", kataSandi: "SandiRev#123", usernameSso: "budi santoso" }),
    /hanya boleh huruf/,
  );

  // tanpa UNILA ID → null; dua akun tanpa UNILA ID boleh
  const b = await buatAkunAsesor(admin, { nama: "Reviewer Dua", email: "reviewer2@uji.test", kataSandi: "SandiRev#123", usernameSso: "" });
  const c = await buatAkunAsesor(admin, { nama: "Reviewer Tiga", email: "reviewer3@uji.test", kataSandi: "SandiRev#123" });
  assert.deepEqual(
    (await prisma.user.findMany({ where: { id: { in: [b.id, c.id] } }, select: { usernameSso: true } })).map((x) => x.usernameSso),
    [null, null],
  );

  // ubah: UNILA ID akun lain ditolak; menyimpan nilai sendiri boleh; mengosongkan → null
  await assert.rejects(ubahIdentitasAkun(admin, b.id, { nama: "Reviewer Dua", usernameSso: "Budi.Santoso" }), GalatPengguna);
  await ubahIdentitasAkun(admin, a.id, { nama: "Reviewer Satu", usernameSso: "budi.santoso" });
  await ubahIdentitasAkun(admin, b.id, { nama: "Reviewer Dua Baru", usernameSso: "sri.rahayu" });
  assert.deepEqual(
    await prisma.user.findUniqueOrThrow({ where: { id: b.id }, select: { name: true, usernameSso: true } }),
    { name: "Reviewer Dua Baru", usernameSso: "sri.rahayu" },
  );
  await ubahIdentitasAkun(admin, b.id, { nama: "Reviewer Dua Baru", usernameSso: "  " });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: b.id } })).usernameSso, null);

  // data pribadi SSO hanya di tabel User/Account: log aktivitas tidak memuat UNILA ID
  const log = await prisma.logAktivitas.findMany({ where: { objekId: { in: [a.id, b.id] } } });
  assert.ok(log.length >= 4);
  for (const l of log) assert.doesNotMatch(JSON.stringify(l.detail ?? {}), /budi\.santoso|sri\.rahayu/i);
});

test("S4: penyaring Tamu baru (terbaru di atas) dan kolom Cara masuk", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  await buatTamuSso("Tamu Lama", "tamu.lama@unila.ac.id", "tamu.lama", new Date("2026-11-01T08:00:00Z"));
  await buatTamuSso("Tamu Baru", "tamu.baru@unila.ac.id", "tamu.baru", new Date("2026-11-20T08:00:00Z"));
  // akun sandi yang juga pernah masuk lewat SSO
  const r = await prisma.user.findFirstOrThrow({ where: { email: "reviewer1@uji.test" } });
  await prisma.account.create({ data: { id: randomUUID(), userId: r.id, accountId: "budi.santoso", providerId: PENYEDIA_SSO } });

  const semua = await daftarAkun(admin);
  const tamu = saringAkun(semua, { tamu: true });
  assert.deepEqual(tamu.map((x) => x.name), ["Tamu Baru", "Tamu Lama"]);
  assert.ok(tamu.every((x) => x.role === "TAMU"));
  assert.equal(saringAkun(semua, {}).length, semua.length);

  const cara = (email: string) => labelCaraMasuk(caraMasukAkun(semua.find((x) => x.email === email)!.accounts));
  assert.equal(cara("tamu.baru@unila.ac.id"), "SSO");
  assert.equal(cara("reviewer1@uji.test"), "Sandi dan SSO");
  assert.equal(cara("reviewer3@uji.test"), "Sandi");
});

test("S4: Tamu diubah menjadi Tim Prodi wajib memilih prodi", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  await siapkanFakultas(admin);
  const prodi = await simpanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "22201", identitas: {} });
  const tamu = await prisma.user.findFirstOrThrow({ where: { email: "tamu.baru@unila.ac.id" } });

  await assert.rejects(ubahPeranAkun(admin, tamu.id, { peran: "TIM_PRODI" }), /Pilih program studi/);
  await assert.rejects(ubahPeranAkun(admin, tamu.id, { peran: "TIM_PRODI", prodiId: "" }), /Pilih program studi/);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: tamu.id } })).role, "TAMU");

  await ubahPeranAkun(admin, tamu.id, { peran: "TIM_PRODI", prodiId: prodi.id });
  const tim = await penggunaDari(tamu.id);
  assert.deepEqual([tim.peran, tim.prodiId], ["TIM_PRODI", prodi.id]);
  assert.equal(saringAkun(await daftarAkun(admin), { tamu: true }).some((x) => x.id === tamu.id), false, "keluar dari Tamu baru");
  // UNILA ID dari SSO tetap
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: tamu.id } })).usernameSso, "tamu.baru");
  // akun Tim Prodi lain tetap bisa dibuat untuk prodi yang sama
  await buatAkunTimProdi(admin, { nama: "Tim Sipil", email: "tim.sipil@uji.test", kataSandi: "SandiSipil#123", prodiId: prodi.id });
});

test("S4: akun tanpa kata sandi (hanya SSO) tidak bisa mengganti atau diatur ulang kata sandinya", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  const tamu = await prisma.user.findFirstOrThrow({ where: { email: "tamu.lama@unila.ac.id" } });
  const p = { ...(await penggunaDari(tamu.id)), punyaSandi: false };
  await assert.rejects(
    gantiKataSandiSendiri(p, { sandiLama: "apa saja", sandiBaru: "SandiBaru#123", ulangi: "SandiBaru#123" }, new Headers()),
    /tidak memakai kata sandi/,
  );
  await assert.rejects(aturUlangKataSandi(admin, { userId: tamu.id, kataSandi: "SandiBaru#123" }), /tidak memakai login email dan kata sandi/);
  assert.equal(await prisma.account.count({ where: { userId: tamu.id, providerId: "credential" } }), 0);
});
