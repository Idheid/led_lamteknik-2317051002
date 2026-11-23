import "./siapan";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/modules/bersama/db";
import { auth } from "@/modules/bersama/auth";
import { aturAktifAkun, buatAkunAsesor, buatAkunTimProdi, simpanProdi } from "@/modules/bersama/data/organisasi";
import { PERSONA_TIRUAN, buatTiketTiruan, type KunciPersona } from "@/modules/bersama/sso/tiruan";
import { PENYEDIA_SSO, type HasilSso } from "@/modules/bersama/sso/penyedia";
import { GET as mulai } from "@/app/api/sso/mulai/route";
import { GET as kembaliGet, POST as kembaliPost } from "@/app/api/sso/kembali/route";
import { GET as tiruanGet, POST as tiruanPost } from "@/app/api/sso/tiruan/route";
import { POST as keluar } from "@/app/api/sso/keluar/route";
import { GET as tiruanKeluar } from "@/app/api/sso/tiruan/keluar/route";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas } from "./bantu";

/** Rencana 18 Nov S5: login SSO lewat rute sungguhan dengan penyedia tiruan. */

const ASAL = "http://localhost:3000";
let admin: Awaited<ReturnType<typeof buatAdmin>>;

before(async () => {
  process.env.SSO_AKTIF = "true";
  process.env.SSO_MODE = "tiruan";
  process.env.BETTER_AUTH_URL = ASAL;
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
});
beforeEach(() => {
  process.env.SSO_AKTIF = "true";
});
after(() => prisma.$disconnect());

/** Mulai login (dapat cookie state), lalu kirim tiket ke alamat kembali seperti browser. */
async function loginSso(hasil: HasilSso, opsi: { ke?: string; stateLain?: string; metode?: "GET" | "POST" } = {}) {
  const r1 = await mulai(new NextRequest(`${ASAL}/api/sso/mulai${opsi.ke ? `?ke=${encodeURIComponent(opsi.ke)}` : ""}`));
  assert.equal(r1.status, 303);
  assert.equal(new URL(r1.headers.get("location")!).pathname, "/api/sso/tiruan");
  const state = r1.cookies.get("sso_state")!.value;
  assert.ok(state.length >= 40);
  const ke = r1.cookies.get("sso_ke")?.value;
  const cookie = `sso_state=${state}${ke ? `; sso_ke=${encodeURIComponent(ke)}` : ""}`;
  const tiket = buatTiketTiruan(hasil);
  const stateKirim = opsi.stateLain ?? state;
  const r2 = opsi.metode === "GET"
    ? await kembaliGet(new NextRequest(`${ASAL}/api/sso/kembali?tiket=${tiket}&state=${encodeURIComponent(stateKirim)}`, { headers: { cookie } }))
    : await kembaliPost(new NextRequest(`${ASAL}/api/sso/kembali`, {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ tiket, state: stateKirim }).toString(),
    }));
  const lokasi = new URL(r2.headers.get("location")!);
  const setCookie = r2.headers.getSetCookie();
  return {
    status: r2.status, jalur: lokasi.pathname + lokasi.search,
    sesi: setCookie.some((c) => /session_token=[^;]+/.test(c) && !/Max-Age=0/i.test(c)),
    cookie: setCookie.filter((c) => !/Max-Age=0/i.test(c)),
  };
}

const ringkas = ({ status, jalur, sesi }: { status: number; jalur: string; sesi: boolean }) => ({ status, jalur, sesi });
const persona = (k: KunciPersona): HasilSso => ({ ...PERSONA_TIRUAN[k].hasil });

test("SSO: dosen terdaftar masuk dengan perannya ke tujuan; sesi lewatSso; Account sso-unila; log tanpa UNILA ID", async () => {
  await siapkanFakultas(admin);
  const prodi = await simpanProdi(admin, { nama: "Teknik Mesin", jenjang: "S1", kodePddikti: "21201", identitas: {} });
  const tim = await buatAkunTimProdi(admin, { nama: "Dosen Mesin", email: "dosen.mesin@uji.test", kataSandi: "SandiMesin#123", prodiId: prodi.id, usernameSso: "dosen.tiruan" });

  const r = await loginSso(persona("dosen-terdaftar"), { ke: "/led" });
  assert.deepEqual([r.status, r.jalur, r.sesi], [303, "/led", true]);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: tim.id }, include: { accounts: true, sessions: true } });
  assert.equal(u.role, "TIM_PRODI", "SSO tidak mengubah peran");
  assert.deepEqual(u.accounts.map((a) => a.providerId).sort(), ["credential", PENYEDIA_SSO]);
  assert.equal(u.sessions.length, 1);
  assert.equal(u.sessions[0].lewatSso, true);
  // keputusan ⏸ S5: sesi SSO 8 jam, tidak diperpanjang saat dipakai
  const sisaJam = (u.sessions[0].expiresAt.getTime() - Date.now()) / 3_600_000;
  assert.ok(sisaJam > 7.9 && sisaJam <= 8, `sisa ${sisaJam} jam`);
  assert.ok(r.cookie.some((c) => /dont_remember=/.test(c)), "cookie dont_remember (tanpa perpanjangan)");
  const jamSesi = r.cookie.map((c) => c.split(";")[0]).join("; ");
  // sesi tampak tua (dibuat 2 hari lalu, batas pembaruan harian lewat) → tetap tidak diperpanjang
  await prisma.session.update({ where: { id: u.sessions[0].id }, data: { createdAt: new Date(Date.now() - 2 * 86_400_000), updatedAt: new Date(Date.now() - 2 * 86_400_000) } });
  const sesi = await auth.api.getSession({ headers: new Headers({ cookie: jamSesi }) });
  assert.equal(sesi?.user.id, tim.id);
  const sesudah = await prisma.session.findUniqueOrThrow({ where: { id: u.sessions[0].id } });
  assert.equal(sesudah.expiresAt.getTime(), u.sessions[0].expiresAt.getTime(), "tidak diperpanjang");
  assert.ok(u.loginTerakhir, "hook session.create tetap mengisi login terakhir");
  const log = await prisma.logAktivitas.findFirstOrThrow({ where: { aksi: "masuk_sso", objekId: tim.id } });
  assert.doesNotMatch(JSON.stringify(log.detail), /dosen\.tiruan|@/);

  // tanpa ke → beranda peran; masuk kedua tidak menambah Account
  const r2 = await loginSso(persona("dosen-terdaftar"));
  assert.equal(r2.jalur.startsWith("/led"), true);
  assert.equal(await prisma.account.count({ where: { userId: tim.id, providerId: PENYEDIA_SSO } }), 1);
  // tujuan berbahaya diabaikan
  assert.equal((await loginSso(persona("dosen-terdaftar"), { ke: "//jahat.test" })).jalur.startsWith("/led"), true);
});

test("SSO: dosen belum terdaftar menjadi Tamu tanpa sandi; Admin UPPS mendapat pemberitahuan", async () => {
  const r = await loginSso(persona("dosen-baru"), { metode: "GET" });
  assert.deepEqual([r.status, r.jalur, r.sesi], [303, "/dashboard", true]);
  const u = await prisma.user.findUniqueOrThrow({ where: { usernameSso: "dosen.baru.tiruan" }, include: { accounts: true } });
  assert.deepEqual([u.role, u.name, u.email, u.emailVerified, u.wajibGantiSandi], ["TAMU", "Dosen Tiruan Baru", "dosen.baru.tiruan@unila.ac.id", true, false]);
  assert.deepEqual(u.accounts.map((a) => [a.providerId, a.accountId, a.password]), [[PENYEDIA_SSO, "dosen.baru.tiruan", null]]);
  const p = await prisma.pemberitahuan.findFirstOrThrow({ where: { userId: admin.id, pesan: { contains: "Tamu baru masuk lewat SSO" } } });
  assert.equal(p.tautan, "/admin/akun?saring=tamu");

  // masuk lagi: akun yang sama, tidak ada pemberitahuan baru
  await loginSso(persona("dosen-baru"));
  assert.equal(await prisma.user.count({ where: { usernameSso: "dosen.baru.tiruan" } }), 1);
  assert.equal(await prisma.pemberitahuan.count({ where: { userId: admin.id, pesan: { contains: "Tamu baru masuk lewat SSO" } } }), 1);
});

test("SSO: email SSO sudah dipakai akun ber-UNILA ID lain → Tamu memakai <username>@sso.invalid", async () => {
  await buatAkunAsesor(admin, { nama: "Pemilik Email", email: "rebutan@unila.ac.id", kataSandi: "SandiRebut#123", usernameSso: "pemilik.lain" });
  const r = await loginSso({ username: "orang.lain", nama: "Orang Lain", email: "rebutan@unila.ac.id", aktif: true, status: "tendik" });
  assert.equal(r.jalur, "/dashboard");
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { usernameSso: "orang.lain" } })).email, "orang.lain@sso.invalid");
});

test("SSO: akun tanpa UNILA ID TIDAK dicocokkan lewat email (keputusan ⏸ S5) → masuk sebagai Tamu baru", async () => {
  const a = await buatAkunAsesor(admin, { nama: "Reviewer Email", email: "reviewer.email@unila.ac.id", kataSandi: "SandiRev#123" });
  const r = await loginSso({ username: "reviewer.email", nama: "Reviewer Email", email: "Reviewer.Email@unila.ac.id", aktif: true, status: "dosen" });
  assert.equal(r.jalur, "/dashboard");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
  assert.deepEqual([u.role, u.usernameSso], ["ASESOR", null], "akun lama tidak disentuh");
  const tamu = await prisma.user.findUniqueOrThrow({ where: { usernameSso: "reviewer.email" } });
  assert.deepEqual([tamu.role, tamu.email], ["TAMU", "reviewer.email@sso.invalid"]);
  // setelah admin mengisi UNILA ID yang benar di akun lama (Tamu dihapus dulu), SSO masuk ke akun lama
  await prisma.user.delete({ where: { id: tamu.id } });
  await prisma.user.update({ where: { id: a.id }, data: { usernameSso: "reviewer.email" } });
  await loginSso({ username: "reviewer.email", nama: "Reviewer Email", email: null, aktif: true, status: "dosen" });
  assert.equal(await prisma.session.count({ where: { userId: a.id, lewatSso: true } }), 1);
});

test("SSO: mahasiswa, akun SSO nonaktif, dan akun aplikasi nonaktif ditolak tanpa membuat akun atau sesi", async () => {
  const sebelum = await prisma.user.count();
  const sesiSebelum = await prisma.session.count();
  assert.deepEqual(ringkas(await loginSso(persona("mahasiswa"))), { status: 303, jalur: "/login?galat=sso_mahasiswa", sesi: false });
  assert.deepEqual(ringkas(await loginSso(persona("nonaktif"))), { status: 303, jalur: "/login?galat=sso_nonaktif", sesi: false });
  // domain email mahasiswa dari konfigurasi
  process.env.SSO_DOMAIN_EMAIL_DITOLAK = "students.unila.ac.id";
  try {
    assert.equal((await loginSso({ username: "x1", nama: "X", email: "x1@students.unila.ac.id", aktif: true, status: null })).jalur, "/login?galat=sso_mahasiswa");
  } finally {
    delete process.env.SSO_DOMAIN_EMAIL_DITOLAK;
  }
  assert.equal(await prisma.user.count(), sebelum);

  const a = await buatAkunAsesor(admin, { nama: "Reviewer Nonaktif", email: "nonaktif@uji.test", kataSandi: "SandiNon#123", usernameSso: "reviewer.nonaktif" });
  await aturAktifAkun(admin, a.id, false);
  const r = await loginSso({ username: "reviewer.nonaktif", nama: "R", email: null, aktif: true, status: "dosen" });
  assert.deepEqual([r.jalur, r.sesi], ["/login?galat=sso_dinonaktifkan", false]);
  assert.equal(await prisma.session.count(), sesiSebelum);
  const log = await prisma.logAktivitas.findMany({ where: { aksi: "sso_ditolak" } });
  assert.deepEqual(new Set(log.map((l) => (l.detail as { kode: string }).kode)), new Set(["sso_mahasiswa", "sso_nonaktif", "sso_dinonaktifkan"]));
  for (const l of log) assert.doesNotMatch(JSON.stringify(l.detail), /@|2115061999|reviewer\.nonaktif/);
});

test("SSO: state salah atau tiket palsu ditolak; SSO mati → sso_mati; penyedia Access belum dikonfigurasi → sso_gagal", async () => {
  const sebelum = await prisma.user.count();
  assert.deepEqual(ringkas(await loginSso(persona("dosen-baru"), { stateLain: "state-lain" })), { status: 303, jalur: "/login?galat=sso_gagal", sesi: false });
  const palsu = await kembaliPost(new NextRequest(`${ASAL}/api/sso/kembali`, {
    method: "POST",
    headers: { cookie: "sso_state=abc", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tiket: "eyJoIjp7fX0.palsu", state: "abc" }).toString(),
  }));
  assert.equal(new URL(palsu.headers.get("location")!).search, "?galat=sso_gagal");
  assert.equal(await prisma.user.count(), sebelum);

  process.env.SSO_AKTIF = "false";
  for (const r of [await mulai(new NextRequest(`${ASAL}/api/sso/mulai`)), await kembaliGet(new NextRequest(`${ASAL}/api/sso/kembali`))]) {
    assert.equal(new URL(r.headers.get("location")!).search, "?galat=sso_mati");
  }
  assert.equal((await tiruanGet(new NextRequest(`${ASAL}/api/sso/tiruan`))).status, 404);
  process.env.SSO_AKTIF = "true";

  process.env.SSO_MODE = "akses";
  try {
    const r = await mulai(new NextRequest(`${ASAL}/api/sso/mulai`));
    assert.equal(new URL(r.headers.get("location")!).search, "?galat=sso_gagal");
    assert.equal((await tiruanGet(new NextRequest(`${ASAL}/api/sso/tiruan`))).status, 404);
  } finally {
    process.env.SSO_MODE = "tiruan";
  }
});

test("SSO: endpoint pembuat sesi hanya bisa dipanggil server, tidak lewat HTTP /api/auth", async () => {
  const u = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const r = await auth.handler(new Request(`${ASAL}/api/auth/sso-unila/masuk`, {
    method: "POST", headers: { "content-type": "application/json", origin: ASAL }, body: JSON.stringify({ userId: u.id }),
  }));
  assert.equal(r.status, 404);
  assert.equal(r.headers.getSetCookie().length, 0);
});

test("SSO tiruan: halaman pilihan dan formulir pengguna lain menuju alamat kembali", async () => {
  const g = await tiruanGet(new NextRequest(`${ASAL}/api/sso/tiruan?state=%22%3E%3Cscript%3E`));
  const html = await g.text();
  assert.equal(g.status, 200);
  for (const p of Object.values(PERSONA_TIRUAN)) assert.ok(html.includes(p.judul));
  assert.ok(!html.includes("<script>"), "state di-escape");
  const p = await tiruanPost(new NextRequest(`${ASAL}/api/sso/tiruan`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ persona: "mahasiswa", state: "s1" }).toString(),
  }));
  const u = new URL(p.headers.get("location")!);
  assert.deepEqual([p.status, u.pathname, u.searchParams.get("state")], [303, "/api/sso/kembali", "s1"]);
  assert.ok(u.searchParams.get("tiket"));
  const salah = await tiruanPost(new NextRequest(`${ASAL}/api/sso/tiruan`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ persona: "toString", state: "s1" }).toString(),
  }));
  assert.equal(salah.status, 400);
});

/** Cookie dari Set-Cookie (nama=nilai) untuk permintaan berikutnya. */
const jadikanCookie = (setCookie: string[]) => setCookie.map((c) => c.split(";")[0]).join("; ");

async function keluarDengan(cookie: string) {
  const r = await keluar(new NextRequest(`${ASAL}/api/sso/keluar`, { method: "POST", headers: { cookie, origin: ASAL } }));
  assert.equal(r.status, 200);
  return { alamat: ((await r.json()) as { alamat: string }).alamat, setCookie: r.headers.getSetCookie() };
}

test("S6: keluar dari sesi SSO → sesi terhapus dan diarahkan ke alamat keluar SSO dengan kembali ke /login", async () => {
  const r = await loginSso(persona("dosen-baru"));
  const u = await prisma.user.findUniqueOrThrow({ where: { usernameSso: "dosen.baru.tiruan" } });
  await prisma.session.deleteMany({ where: { userId: u.id } });
  const r2 = await loginSso(persona("dosen-baru"));
  assert.equal(r.sesi && r2.sesi, true);
  assert.equal(await prisma.session.count({ where: { userId: u.id } }), 1);

  const k = await keluarDengan(jadikanCookie(r2.cookie));
  const tujuan = new URL(k.alamat, ASAL);
  assert.equal(tujuan.pathname, "/api/sso/tiruan/keluar");
  assert.equal(tujuan.searchParams.get("kembali"), `${ASAL}/login`);
  assert.equal(await prisma.session.count({ where: { userId: u.id } }), 0, "sesi aplikasi terhapus");
  assert.ok(k.setCookie.some((c) => /session_token=;|session_token=.*Max-Age=0/i.test(c)), "cookie sesi dihapus");

  // halaman keluar tiruan kembali ke login; alamat luar diabaikan
  const t = await tiruanKeluar(new NextRequest(new URL(k.alamat, ASAL)));
  assert.equal(t.headers.get("location"), `${ASAL}/login?keluar=sso`);
  const jahat = await tiruanKeluar(new NextRequest(`${ASAL}/api/sso/tiruan/keluar?kembali=${encodeURIComponent("https://jahat.test/x")}`));
  assert.equal(jahat.headers.get("location"), `${ASAL}/login?keluar=sso`);
});

test("S6: keluar dari login kata sandi → sesi terhapus, ke /login (tanpa SSO); tanpa sesi tetap /login", async () => {
  await buatAkunAsesor(admin, { nama: "Reviewer Sandi", email: "reviewer.sandi@uji.test", kataSandi: "SandiRev#123" });
  const masuk = await auth.api.signInEmail({ body: { email: "reviewer.sandi@uji.test", password: "SandiRev#123" }, returnHeaders: true });
  const userId = masuk.response.user.id;
  assert.equal(await prisma.session.count({ where: { userId } }), 1);
  const k = await keluarDengan(jadikanCookie(masuk.headers.getSetCookie()));
  assert.equal(k.alamat, "/login");
  assert.equal(await prisma.session.count({ where: { userId } }), 0);
  assert.equal((await keluarDengan("")).alamat, "/login");
});

test("S6: penyedia Access belum dikonfigurasi → sesi SSO tetap terhapus, ke /login", async () => {
  const r = await loginSso(persona("dosen-terdaftar"));
  const sebelum = await prisma.session.count({ where: { lewatSso: true } });
  process.env.SSO_MODE = "akses";
  try {
    const k = await keluarDengan(jadikanCookie(r.cookie));
    assert.equal(k.alamat, "/login");
    assert.equal(await prisma.session.count({ where: { lewatSso: true } }), sebelum - 1);
  } finally {
    process.env.SSO_MODE = "tiruan";
  }
});
