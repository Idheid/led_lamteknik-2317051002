import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { GalatAkses, GalatPengguna } from "@/lib/akses";
import {
  aturAktifAkun, aturUlangKataSandi, buatAkunPenanggungJawab, buatAkunSuperAdmin, gantiKataSandiSendiri, hapusAkun,
  simpanProdi, simpanUpps,
} from "@/lib/data/organisasi";
import { buatProyek } from "@/lib/data/proyek";
import { tambahKunci } from "@/lib/data/kunci-api";
import { bersihkanDb, bisaLogin, buatSuperAdmin, imporSeed, penggunaDari } from "./bantu";

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

test("Akun: super admin membuat super admin lain; minimal satu super admin aktif; tidak bisa menonaktifkan diri", async () => {
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

test("Akun: satu akun aktif per prodi; pergantian PJ; data prodi tetap ada setelah akun dihapus", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  const upps = await simpanUpps(admin, { kode: "FT-AKUN", nama: "Fakultas Teknik", perguruanTinggi: "Universitas Uji", alamat: "" });
  const prodi = await simpanProdi(admin, { uppsId: upps.id, nama: "Teknik Elektro", jenjang: "S1", kodePddikti: "20201", identitas: {} });
  const lama = await buatAkunPenanggungJawab(admin, { prodiId: prodi.id, nama: "PJ Lama", email: "pj.lama@uji.test", kataSandi: "SandiLama#123" });
  const pjLama = await penggunaDari(lama.id);
  await assert.rejects(
    buatAkunPenanggungJawab(admin, { prodiId: prodi.id, nama: "PJ Baru", email: "pj.baru@uji.test", kataSandi: "SandiBaru#123" }),
    GalatPengguna,
  );

  const versi = await prisma.versiInstrumen.findFirstOrThrow({ where: { aktif: true } });
  const proyek = await buatProyek(pjLama, { nama: "LED Elektro", versiId: versi.id, tsTahunMulai: 2025 });
  await tambahKunci(pjLama, { label: "Kunci prodi", kunci: "AIzaSyUjiAkun0000000000000000000000000" });
  // format kunci Google yang baru memuat titik ("AQ.…")
  const baruFormat = await tambahKunci(pjLama, { label: "Kunci format baru", kunci: "AQ.Ab8RUjiPalsu000000000000000000-xyz_9" });
  assert.equal(baruFormat.akhiran, "yz_9");
  // simbol lain yang mungkin muncul di format kunci mendatang
  await tambahKunci(pjLama, { label: "Kunci simbol", kunci: "XY$Uji+Palsu/0000=0000~0000!0000@#%&*" });
  await assert.rejects(tambahKunci(pjLama, { label: "Kunci rusak", kunci: "AQ.kunci dengan spasi 0000000000" }));

  // serah terima: nonaktifkan akun lama, buat akun baru
  await aturAktifAkun(admin, lama.id, false);
  const baru = await buatAkunPenanggungJawab(admin, { prodiId: prodi.id, nama: "PJ Baru", email: "pj.baru@uji.test", kataSandi: "SandiBaru#123" });
  // akun lama tidak bisa diaktifkan lagi selama ada PJ aktif lain
  await assert.rejects(aturAktifAkun(admin, lama.id, true), GalatPengguna);

  await hapusAkun(admin, lama.id);
  assert.ok(await prisma.proyekLED.findUnique({ where: { id: proyek.id } }), "proyek tetap ada");
  const kunci = await prisma.kunciAPI.findFirstOrThrow({ where: { prodiId: prodi.id } });
  assert.equal(kunci.pemilikId, null, "kunci tetap milik prodi");
  const pjBaru = await penggunaDari(baru.id);
  assert.equal(pjBaru.prodiId, prodi.id);
  assert.equal((await prisma.proyekLED.findMany({ where: { prodiId: pjBaru.prodiId! } })).length, 1, "PJ baru melihat proyek prodi");
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
