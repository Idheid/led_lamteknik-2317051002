import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { auth } from "@/modules/bersama/auth";
import { GalatAkses, GalatPengguna } from "@/modules/bersama/akses";
import {
  aturAktifAkun, aturUlangKataSandi, buatAkunPenanggungJawab, buatAkunSuperAdmin, gantiKataSandiSendiri, hapusAkun,
  simpanProdi,
} from "@/modules/bersama/data/organisasi";
import { buatProyek, daftarProyek } from "@/modules/led/data/proyek";
import { daftarKunci, tambahKunci } from "@/modules/bersama/data/kunci-api";
import { bersihkanDb, bisaLogin, buatSuperAdmin, imporSeed, penggunaDari, siapkanPj } from "./bantu";

before(async () => {
  await bersihkanDb();
  await imporSeed();
});
after(() => prisma.$disconnect());

/** Login lalu kembalikan header cookie sesi (seperti permintaan dari browser). */
async function headerSesi(email: string, password: string): Promise<Headers> {
  const r = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return new Headers({ cookie });
}

test("Akun: admin membuat admin lain; minimal satu admin aktif; tidak bisa menonaktifkan diri", async () => {
  const admin = await buatSuperAdmin();
  const baru = await buatAkunSuperAdmin(admin, { nama: "Admin Fakultas", email: "fakultas@uji.test", kataSandi: "SandiFak#123" });
  const admin2 = await penggunaDari(baru.id);
  assert.equal(admin2.peran, "SUPER_ADMIN");
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: baru.id } })).wajibGantiSandi, true, "akun baru wajib ganti sandi");

  await assert.rejects(aturAktifAkun(admin, admin.id, false), GalatPengguna);
  await assert.rejects(hapusAkun(admin, admin.id), GalatPengguna);
  await assert.rejects(aturUlangKataSandi(admin, { userId: admin.id, kataSandi: "SandiLain#123" }), GalatPengguna);

  // admin2 menonaktifkan admin pertama: masih ada admin2 yang aktif
  await aturAktifAkun(admin2, admin.id, false);
  // admin pertama nonaktif → admin2 satu-satunya super admin aktif; tidak boleh dinonaktifkan/dihapus oleh siapa pun
  const admin3 = await buatAkunSuperAdmin(admin2, { nama: "Admin Tiga", email: "tiga@uji.test", kataSandi: "SandiTiga#123" });
  await aturAktifAkun(admin2, admin3.id, false);
  await assert.rejects(hapusAkun(await penggunaDari(admin3.id), admin2.id), GalatPengguna, "super admin aktif terakhir");
  await aturAktifAkun(admin2, admin.id, true);
  await hapusAkun(admin2, admin3.id);
  assert.equal(await prisma.user.count({ where: { role: "SUPER_ADMIN" } }), 2);
});

test("Akun: serah terima PJ fakultas: akun pengganti dibuat, akun lama dinonaktifkan/dihapus; LED dan kunci tetap milik fakultas", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  const pjLama = await siapkanPj(admin, "pj.lama@uji.test");
  const prodi = await simpanProdi(pjLama, { nama: "Teknik Elektro", jenjang: "S1", kodePddikti: "20201", identitas: {} });
  const proyek = await buatProyek(pjLama, { prodiId: prodi.id, nama: "LED Elektro", tahunPengajuan: 2026 });
  await tambahKunci(pjLama, { label: "Kunci fakultas", kunci: "AIzaSyUjiAkun0000000000000000000000000" });
  // format kunci Google yang baru memuat titik ("AQ.…") dan simbol lain
  const baruFormat = await tambahKunci(pjLama, { label: "Kunci format baru", kunci: "AQ.Ab8RUjiPalsu000000000000000000-xyz_9" });
  assert.equal(baruFormat.akhiran, "yz_9");
  await tambahKunci(pjLama, { label: "Kunci simbol", kunci: "XY$Uji+Palsu/0000=0000~0000!0000@#%&*" });
  await assert.rejects(tambahKunci(pjLama, { label: "Kunci rusak", kunci: "AQ.kunci dengan spasi 0000000000" }));

  const baru = await buatAkunPenanggungJawab(admin, { nama: "PJ Baru", email: "pj.baru@uji.test", kataSandi: "SandiBaru#123" });
  await aturAktifAkun(admin, pjLama.id, false);
  await hapusAkun(admin, pjLama.id);
  assert.ok(await prisma.proyekLED.findUnique({ where: { id: proyek.id } }), "LED tetap ada");
  const kunci = await prisma.kunciAPI.findFirstOrThrow({ where: { label: "Kunci fakultas" } });
  assert.equal(kunci.pemilikId, null, "kunci tetap milik fakultas");
  const pjBaru = await penggunaDari(baru.id);
  assert.deepEqual((await daftarProyek(pjBaru)).map((x) => x.id), [proyek.id], "PJ baru melihat semua LED fakultas");
  assert.equal((await daftarKunci(pjBaru)).length, 3, "PJ baru memakai kunci fakultas yang sama");
});

test("Akun: ganti kata sandi sendiri wajib kata sandi lama; status wajib ganti sandi hilang", async () => {
  const u = await prisma.user.findFirstOrThrow({ where: { email: "pj.baru@uji.test" } });
  const pj = await penggunaDari(u.id);
  assert.equal(u.wajibGantiSandi, true);
  const headers = await headerSesi("pj.baru@uji.test", "SandiBaru#123");

  await assert.rejects(
    gantiKataSandiSendiri(pj, { sandiLama: "salah-sandi", sandiBaru: "SandiPj#456", ulangi: "SandiPj#456" }, headers),
    GalatPengguna,
  );
  await assert.rejects(
    gantiKataSandiSendiri(pj, { sandiLama: "SandiBaru#123", sandiBaru: "SandiPj#456", ulangi: "beda" }, headers),
  );
  await gantiKataSandiSendiri(pj, { sandiLama: "SandiBaru#123", sandiBaru: "SandiPj#456", ulangi: "SandiPj#456" }, headers);
  assert.equal(await bisaLogin("pj.baru@uji.test", "SandiBaru#123"), false);
  assert.equal(await bisaLogin("pj.baru@uji.test", "SandiPj#456"), true);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).wajibGantiSandi, false);

  // atur ulang oleh super admin → wajib ganti lagi; penanggung jawab tidak bisa mengatur ulang sandi akun lain
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  await assert.rejects(aturUlangKataSandi(pj, { userId: admin.id, kataSandi: "SandiX#12345" }), GalatAkses);
  await aturUlangKataSandi(admin, { userId: u.id, kataSandi: "SandiReset#789" });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).wajibGantiSandi, true);
});
