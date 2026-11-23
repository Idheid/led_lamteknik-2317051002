import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { auth } from "@/modules/bersama/auth";
import { kunciLogin } from "@/modules/bersama/data/login-gagal";
import { KODE_LOGIN_TERKUNCI } from "@/modules/bersama/domain/login-gagal";
import { bersihkanDb, buatAdmin } from "./bantu";

/** Rencana 18 Nov S3: 3 kali gagal → percobaan keempat ditolak; 5 menit kemudian bisa lagi; berhasil menghapus hitungan. */

const EMAIL = "kunci@uji.test";
const SANDI = "SandiAdmin#123";

async function masuk(password: string): Promise<{ ok: boolean; status?: number; code?: string; pesan?: string }> {
  try {
    await auth.api.signInEmail({ body: { email: EMAIL, password } });
    return { ok: true };
  } catch (e) {
    const g = e as { statusCode?: number; body?: { code?: string; message?: string } };
    return { ok: false, status: g.statusCode, code: g.body?.code, pesan: g.body?.message };
  }
}

before(async () => {
  await bersihkanDb();
  await buatAdmin(EMAIL);
});

after(() => prisma.$disconnect());

test("tiga kali kata sandi salah → percobaan keempat (walau benar) ditolak 429 dengan pesan menit", async () => {
  for (let i = 0; i < 3; i++) assert.equal((await masuk("salah-sekali")).status, 401);
  const r = await masuk(SANDI);
  assert.equal(r.ok, false);
  assert.equal(r.status, 429);
  assert.equal(r.code, KODE_LOGIN_TERKUNCI);
  assert.match(r.pesan ?? "", /^Terlalu banyak percobaan\. Coba lagi dalam [1-5] menit\.$/);
  // percobaan yang ditolak tidak dicatat; email asli tidak disimpan
  const log = await prisma.logLoginGagal.findMany();
  assert.equal(log.length, 3);
  assert.ok(log.every((l) => l.kunci === kunciLogin(EMAIL) && /^[0-9a-f]{64}$/.test(l.kunci) && !l.kunci.includes("@")));
  // email dinormalisasi: huruf besar/spasi tetap terkunci
  try {
    await auth.api.signInEmail({ body: { email: `  ${EMAIL.toUpperCase()} `, password: SANDI } });
    assert.fail("seharusnya terkunci");
  } catch (e) {
    assert.equal((e as { statusCode?: number }).statusCode, 429);
  }
});

test("setelah 5 menit (waktu log dimundurkan) login bisa lagi dan berhasil menghapus hitungan", async () => {
  await prisma.logLoginGagal.updateMany({ data: { waktu: new Date(Date.now() - 301_000) } });
  assert.equal((await masuk(SANDI)).ok, true);
  assert.equal(await prisma.logLoginGagal.count({ where: { kunci: kunciLogin(EMAIL) } }), 0);
});

test("login berhasil di tengah jalan mengosongkan hitungan (2 gagal + berhasil + 2 gagal → belum terkunci)", async () => {
  await masuk("salah");
  await masuk("salah");
  assert.equal((await masuk(SANDI)).ok, true);
  await masuk("salah");
  await masuk("salah");
  assert.equal((await masuk(SANDI)).ok, true);
});
