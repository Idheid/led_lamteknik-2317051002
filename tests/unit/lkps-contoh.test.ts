/**
 * F-08: LKPS contoh (fiktif) dibaca benar dan metrik butir angka sama dengan hitungan manual
 * di docs/uji/hitungan-manual-lkps.md. Tidak butuh basis data.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bacaLembarXlsx, bacaLkpsDariLembar, bacaLkpsXlsx, nomorKolom } from "@/lib/lkps/baca-xlsx";
import { hitungSemua, type HasilButirAngka } from "@/lib/domain/metrik-lkps";

const FIKSTUR = resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx");
const k = { tsTahunMulai: 2025 };

async function baca() {
  return bacaLkpsXlsx(readFileSync(FIKSTUR), "S1");
}

function nilai(h: HasilButirAngka[], butir: string, kode: string): number | null {
  const b = h.find((x) => x.butir === butir);
  assert.ok(b, `butir ${butir} tidak ada`);
  const m = b.metrik.find((x) => x.kode === kode);
  assert.ok(m, `metrik ${kode} tidak ada di butir ${butir}`);
  return m.nilai;
}

function dekat(a: number | null, b: number, pesan: string) {
  assert.ok(a !== null && Math.abs(a - b) <= 1e-4, `${pesan}: ${a} ≠ ${b}`);
}

test("LKPS contoh terbaca: tabel, identitas, tanpa galat struktur", async () => {
  const h = await baca();
  assert.deepEqual(h.masalah.filter((m) => m.tingkat === "galat"), []);
  assert.equal(h.identitas.tanggalTs, "2026-08-31");
  assert.equal(h.identitas.namaProgramStudi, "Teknik Contoh");
  const t = new Map(h.tabel.map((x) => [x.sheet, x]));
  // sheet yang tidak berlaku untuk Sarjana tidak dibaca
  assert.ok(!t.has("3a2") && !t.has("4e") && !t.has("6e2") && !t.has("4k"));
  assert.equal(t.get("4a")?.baris.length, 15);
  assert.equal(t.get("4a")?.kode, "4.a");
  assert.equal(t.get("4a")?.baris[0].sel.B, "Dosen Contoh 1");
  assert.equal(t.get("2a1")?.baris[0].sel.H, "2023-01-10"); // tanggal dibaca sebagai ISO
  assert.equal(t.get("6d")?.blok?.includes("Sarjana"), true);
  assert.deepEqual(t.get("6d")?.baris.map((b) => b.sel.A), ["TS-7", "TS-6", "TS-5", "TS-4", "TS-3", "TS-2", "TS-1", "TS"]);
  assert.deepEqual(t.get("6f1")?.baris.map((b) => b.sel.A), ["TS-2", "TS-1"]);
  assert.equal(t.get("4f-3")?.kolom.some((c) => c.kunci === "D"), true); // kolom tanpa nomor tetap dibaca
  assert.deepEqual(t.get("2b")?.kolomRumus.sort(), ["F", "J"]);
  // satu-satunya peringatan: tabel paten mahasiswa memang kosong
  assert.deepEqual(h.masalah.map((m) => m.sheet), ["6e3-1"]);
});

test("metrik butir angka = hitungan manual", async () => {
  const h = hitungSemua((await baca()).tabel, k);
  const harap: [string, string, number][] = [
    ["6-I", "M-RK", 0.75], ["6-II", "M-NI", 2], ["6-II", "M-NN", 4], ["6-II", "M-NW", 3],
    ["9", "M-BOP", 5_000_000], ["10", "M-DPD", 12_500_000], ["11", "M-DPkMD", 3_000_000],
    ["18", "M-PJP", 40 / 144], ["19", "M-SKS_BASIC", 26],
    ["23", "M-NPMhs", 10], ["23", "M-NPD", 38], ["23", "M-PPDMhs", 10 / 38],
    ["25", "M-NPKMhs", 8], ["25", "M-NPKD", 33], ["25", "M-PKDMhs", 8 / 33],
    ["26", "M-NDTPS", 12], ["26", "M-NDT", 13], ["26", "M-NDTT", 2], ["26", "M-PDTT", 2 / 15],
    ["27", "M-PDS3", 5 / 12], ["28", "M-PGBLKL", 0.75], ["30", "M-RBK", 184 / 12],
    ["31", "M-31-RI", 2 / 3 / 12], ["31", "M-31-RN", 12 / 3 / 12], ["31", "M-31-RW", 24 / 3 / 12],
    ["32", "M-32-RN", 6 / 3 / 12], ["32", "M-32-RW", 27 / 3 / 12],
    ["33", "M-33-RI", 1], ["33", "M-33-RN", 1.5], ["33", "M-33-RW", 1],
    ["34", "M-RLP", 17 / 12], ["35", "M-PKDTPS", 7 / 12], ["36", "M-PKIB", 4 / 12], ["37", "M-PRDTPS", 4 / 12],
    ["40", "M-RMD", 350 / 12], ["41", "M-PMA", 3 / 350], ["42", "M-RIPK", 905.5 / 270],
    ["43-I", "M-43-I_NI", 1], ["43-I", "M-43-I_NN", 5], ["43-I", "M-43-I_NW", 4],
    ["43-II", "M-43-II_NN", 3], ["43-II", "M-43-II_NW", 6],
    ["44", "M-MS", 926.25 / 200], ["45", "M-PTW", 0.55],
    ["46", "M-46-RI", 3 / 350], ["46", "M-46-RN", 6 / 350], ["46", "M-46-RW", 16 / 350],
    ["47", "M-NLP", 7], ["49", "M-WT", 435 / 85], ["49", "M-RESPONDEN_WT", 0.5], ["50", "M-KBK", 76 / 85],
    ["51", "M-51-RI", 10 / 170], ["51", "M-51-RN", 36 / 170], ["52", "M-TK", 23 / 7],
  ];
  for (const [butir, kode, n] of harap) dekat(nilai(h, butir, kode), n, `${butir} ${kode}`);
});

test("skor perkiraan = hitungan manual", async () => {
  const h = hitungSemua((await baca()).tabel, k);
  const skor: Record<string, number> = {
    "6-I": 0.75, "6-II": 3.75, "9": 1, "10": 4, "11": 2.4, "18": 4, "19": 4, "23": 2.578947, "25": 2.454545,
    "26": 3.777778, "27": 3.666667, "28": 4, "30": 4, "31": 4, "32": 2.708333, "33": 4, "34": 2.944444, "35": 4,
    "36": 4, "37": 3.333333, "40": 2.75, "41": 3.714286, "42": 4, "43-I": 3.75, "43-II": 2.066327, "44": 3.8875,
    "45": 4, "46": 3.326414, "47": 3.4, "49": 3.576471, "50": 4, "51": 4, "52": 3.285714,
  };
  for (const [butir, s] of Object.entries(skor)) dekat(h.find((x) => x.butir === butir)?.skor ?? null, s, `skor ${butir}`);
  assert.ok(h.every((x) => x.lengkap), "semua butir punya data");
});

test("validasi: sheet hilang dan struktur berubah adalah galat, sel kosong adalah peringatan", async () => {
  const asli = await bacaLembarXlsx(readFileSync(FIKSTUR));
  const ubah = (sheet: string, r: number, kolom: string, nilai: string | null) => {
    const salinan = structuredClone(asli);
    const l = salinan.find((x) => x.nama === sheet)!;
    if (nilai === null) l.sel.get(r)?.delete(nomorKolom(kolom));
    else l.sel.get(r)!.set(nomorKolom(kolom), { nilai, rumus: false });
    return salinan;
  };

  const tanpa4c = bacaLkpsDariLembar(asli.filter((l) => l.nama !== "4c"), "S1");
  assert.ok(tanpa4c.masalah.some((m) => m.tingkat === "galat" && m.sheet === "4c" && /tidak ditemukan/.test(m.pesan)));

  const rusak = bacaLkpsDariLembar(ubah("4a", 13, "A", "Nomor"), "S1"); // baris nomor kolom 4.a dirusak
  assert.ok(rusak.masalah.some((m) => m.tingkat === "galat" && m.sheet === "4a" && /struktur/i.test(m.pesan)));

  const kosong = bacaLkpsDariLembar(ubah("4a", 15, "K", null), "S1"); // jabatan dosen ke-2 dikosongkan
  assert.ok(kosong.masalah.some((m) => m.tingkat === "peringatan" && m.sheet === "4a" && m.kolom === "K" && m.baris === 15));
  assert.equal(kosong.masalah.filter((m) => m.tingkat === "galat").length, 0);
});

test("berkas bukan Excel ditolak dengan pesan jelas", async () => {
  const h = await bacaLkpsXlsx(Buffer.from("bukan excel"), "S1");
  assert.equal(h.masalah[0].tingkat, "galat");
  assert.match(h.masalah[0].pesan, /tidak bisa dibuka/);
});
