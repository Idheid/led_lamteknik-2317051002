import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { oneDataAktif, statusOneData, VARIABEL_ONEDATA } from "../../src/modules/lkps/data/onedata/konfigurasi";
import { ambilOneData, lupakanTokenOneData, tokenOneData } from "../../src/modules/lkps/data/onedata/klien";
import { idSmsProdi } from "../../src/modules/lkps/domain/onedata-prodi";

/** Gabung LKPS G6 (RENCANA-GABUNG-LKPS G6 butir 5): One Data mati secara bawaan; klien diuji tanpa jaringan. */

const akar = join(__dirname, "..", "..");
const LENGKAP = {
  LKPS_ONEDATA_AKTIF: "true",
  MYUNILA_API_URL: "https://contoh.invalid/api/",
  MYUNILA_APP_ID: "id-uji",
  MYUNILA_USERNAME: "pengguna-uji",
  MYUNILA_PASSWORD: "sandi-uji",
};
const fetchAsli = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = fetchAsli;
  lupakanTokenOneData();
});

test("konfigurasi: mati secara bawaan, menyala hanya bila LKPS_ONEDATA_AKTIF=true dan semua variabel terisi", () => {
  assert.equal(oneDataAktif({}), false);
  assert.equal(oneDataAktif({ ...LENGKAP, LKPS_ONEDATA_AKTIF: "false" }), false);
  for (const v of VARIABEL_ONEDATA) {
    const s = statusOneData({ ...LENGKAP, [v]: " " });
    assert.equal(s.aktif, false, v);
    assert.ok(!s.aktif && s.kosong.includes(v));
  }
  const s = statusOneData(LENGKAP);
  assert.ok(s.aktif);
  assert.equal(s.aktif && s.konfigurasi.url, "https://contoh.invalid/api");
});

test("kode tidak memuat nilai bawaan kredensial (hanya process.env tanpa ||/??)", () => {
  for (const f of ["konfigurasi.ts", "klien.ts", "sinkron.ts"]) {
    const isi = readFileSync(join(akar, "src/modules/lkps/data/onedata", f), "utf8");
    assert.doesNotMatch(isi, /process\.env\.MYUNILA_\w+\s*(\|\||\?\?)/, f);
    assert.doesNotMatch(isi, /console\.(log|info|warn|error)/, f);
  }
});

function palsuFetch(opsi: { cekSah?: boolean } = {}) {
  const panggilan: { url: string; metode: string; auth: string | null }[] = [];
  globalThis.fetch = (async (masukan: string | URL | Request, init?: RequestInit) => {
    const url = String(masukan);
    const headers = new Headers(init?.headers);
    panggilan.push({ url, metode: init?.method ?? "GET", auth: headers.get("Authorization") });
    if (url.endsWith("/v1/auth/login")) {
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(Object.keys(body).sort(), ["id_aplikasi", "password", "username"]);
      return Response.json({ data: { access_token: `token-${panggilan.length}`, expires_in: 3600 } });
    }
    if (url.endsWith("/v1/auth/check-token")) return new Response(null, { status: opsi.cekSah === false ? 401 : 200 });
    return Response.json({ data: [{ id: 1 }] });
  }) as typeof fetch;
  return panggilan;
}

test("menyala: login sekali lalu memakai token tersimpan (Bearer)", async () => {
  const panggilan = palsuFetch();
  const s = statusOneData(LENGKAP);
  assert.ok(s.aktif);
  await ambilOneData(s.konfigurasi, "/v1/sdm/list_sdm", { limit: 5, kosong: "" });
  await ambilOneData(s.konfigurasi, "/v1/akademik/list_matkul", { id_sms: "x" });
  const login = panggilan.filter((x) => x.url.endsWith("/v1/auth/login"));
  assert.equal(login.length, 1);
  assert.equal(login[0].metode, "POST");
  const data = panggilan.filter((x) => !x.url.includes("/v1/auth/"));
  assert.equal(data.length, 2);
  assert.ok(data.every((x) => x.auth === "Bearer token-1"));
  assert.equal(data[0].url, "https://contoh.invalid/api/v1/sdm/list_sdm?limit=5");
});

test("token tersimpan dicek ulang lewat /v1/auth/check-token; tidak sah → login ulang", async () => {
  const s = statusOneData(LENGKAP);
  assert.ok(s.aktif);
  const t0 = 1_000_000_000_000;
  let panggilan = palsuFetch();
  assert.equal(await tokenOneData(s.konfigurasi, t0), "token-1");
  // sebelum 5 menit: tanpa cek
  assert.equal(await tokenOneData(s.konfigurasi, t0 + 60_000), "token-1");
  assert.equal(panggilan.filter((x) => x.url.endsWith("/check-token")).length, 0);
  // sesudah 5 menit: cek, sah → tetap
  assert.equal(await tokenOneData(s.konfigurasi, t0 + 6 * 60_000), "token-1");
  assert.equal(panggilan.filter((x) => x.url.endsWith("/check-token")).length, 1);
  // cek tidak sah → login ulang
  panggilan = palsuFetch({ cekSah: false });
  assert.notEqual(await tokenOneData(s.konfigurasi, t0 + 12 * 60_000), "token-1");
  assert.equal(panggilan.filter((x) => x.url.endsWith("/v1/auth/login")).length, 1);
});

test("galat login tidak membawa isi respons (mungkin memuat kredensial)", async () => {
  globalThis.fetch = (async () => new Response("id_aplikasi=rahasia", { status: 401 })) as typeof fetch;
  const s = statusOneData(LENGKAP);
  assert.ok(s.aktif);
  await assert.rejects(tokenOneData(s.konfigurasi), (e: Error) => !e.message.includes("rahasia") && e.message.includes("401"));
});

test("id_sms prodi dari nama (pemetaan kode asal)", () => {
  assert.ok(idSmsProdi("Teknik Informatika").length > 0);
  assert.deepEqual([...idSmsProdi("Prodi Tak Dikenal")], []);
});

test("rute sinkron: jalankanRute + prodi aktif, 503 bila mati; halaman impor menerima status dari server", () => {
  const rute = readFileSync(join(akar, "src/app/api/lkps/onedata/sinkron/route.ts"), "utf8");
  assert.match(rute, /jalankanRute/);
  assert.match(rute, /prodiAktifWajib/);
  assert.match(rute, /status: 503/);
  const halaman = readFileSync(join(akar, "src/app/lkps/impor/page.tsx"), "utf8");
  assert.match(halaman, /oneDataAktif=\{oneDataAktif\(\)\}/);
  const komponen = readFileSync(join(akar, "src/modules/lkps/komponen/impor/halaman-impor.tsx"), "utf8");
  assert.match(komponen, /disabled=\{syncLoading \|\| !oneDataAktif\}/);
  assert.match(komponen, /Sinkron One Data belum diaktifkan/);
});
