import { test } from "node:test";
import assert from "node:assert/strict";
import { AMBANG_NAIK, PengaturParalel } from "../../src/modules/led/domain/paralel-adaptif";
import { bolehDigabung, jumlahGabung, susunPenggunaGabung } from "../../src/modules/led/domain/gabung";
import { perkiraanPermintaan, perkiraanToken, type SubPerkiraan } from "../../src/modules/led/domain/perkiraan-susun";
import { versiPemrosesan } from "../../src/modules/led/domain/versi-pemrosesan";
import { OPSI_POTONG } from "../../src/modules/led/domain/potong-teks";
import { proyekGoogleGanda } from "../../src/modules/bersama/domain/kunci-api";

/** Rencana 10 Nov T9: hemat kuota dan cepat (bagian murni). */

test("paralel adaptif: naik 1 setiap 20 panggilan tanpa 429 sampai maks, turun ke separuh saat 429", () => {
  const p = new PengaturParalel(2, 4);
  assert.equal(p.nilai, 2);
  p.berhasil(AMBANG_NAIK - 1);
  assert.equal(p.nilai, 2);
  p.berhasil();
  assert.equal(p.nilai, 3);
  p.berhasil(AMBANG_NAIK * 5);
  assert.equal(p.nilai, 4, "tidak melewati maks");
  p.kena429();
  assert.equal(p.nilai, 2);
  p.berhasil(AMBANG_NAIK - 1);
  p.kena429();
  p.kena429();
  assert.equal(p.nilai, 1, "paling sedikit 1; hitungan tanpa 429 diulang dari nol");
  p.berhasil(AMBANG_NAIK - 1);
  assert.equal(p.nilai, 1);
});

test("mode gabung: hanya sub-bagian pendek non-IKU/AF/SWOT/penutup, sampai 3, total potongan ≤ 20", () => {
  assert.equal(bolehDigabung("C.1-LB"), true);
  for (const k of ["C.1-IKU-a", "C.1-AF", "C.1-SWOT", "AWAL-PENGANTAR", "IV-1"]) assert.equal(bolehDigabung(k), false, k);
  const c = (kode: string, targetKata = 200, potongan = 5) => ({ kode, targetKata, potongan });
  assert.equal(jumlahGabung([c("C.1-LB"), c("C.1-KEB"), c("C.1-X"), c("C.1-Y")]), 3);
  assert.equal(jumlahGabung([c("C.1-LB"), c("C.1-KEB", 300)]), 0, "target > 250 memutus kelompok");
  assert.equal(jumlahGabung([c("C.1-LB", 200, 12), c("C.1-KEB", 200, 9)]), 0, "total potongan > 20");
  assert.equal(jumlahGabung([c("C.1-LB"), c("C.1-KEB"), c("C.1-AF")]), 2);
  assert.equal(jumlahGabung([c("C.1-LB")]), 0, "satu saja tidak digabung");
  assert.match(susunPenggunaGabung([{ kode: "C.1-LB", pengguna: "isi" }, { kode: "C.1-KEB", pengguna: "isi" }]), /# SUB-BAGIAN 2 \(kode C\.1-KEB\)/);
});

test("perkiraan: permintaan = generate + 1 pemeriksaan per bagian (+ paling banyak 2 per bagian); token kasar", () => {
  const sub: SubPerkiraan[] = [
    { bagian: "C.1", status: "kirim", panjangMasukan: 4000, targetKata: 300 },
    { bagian: "C.1", status: "kirim", panjangMasukan: 4000, targetKata: 300 },
    { bagian: "C.1", status: "dilewati", panjangMasukan: 4000, targetKata: 300 },
    { bagian: "C.2", status: "tanpa_ai", panjangMasukan: 4000, targetKata: 300 },
    { bagian: "C.3", status: "kirim", panjangMasukan: 2000, targetKata: 150 },
  ];
  assert.deepEqual(perkiraanPermintaan(sub), { generate: 3, pemeriksaan: 2, perbaikanMaks: 4, min: 5, maks: 9 });
  const t = perkiraanToken(sub);
  assert.equal(t.masuk, 1000 + 1000 + 500 + Math.round((600 + 600 + 300) * 1.5));
  assert.equal(t.keluar, 1500 + 40 * (20 + 20 + 10));
});

test("versi pemrosesan berubah bila aturan potong, kepala, OCR, atau model berubah", () => {
  const a = versiPemrosesan("gemini-embedding-001", "ocr-v1");
  assert.equal(a, versiPemrosesan("gemini-embedding-001", "ocr-v1"));
  assert.notEqual(a, versiPemrosesan("gemini-embedding-002", "ocr-v1"));
  assert.notEqual(a, versiPemrosesan("gemini-embedding-001", "ocr-v2"));
  assert.notEqual(a, versiPemrosesan("gemini-embedding-001", "ocr-v1", { ...OPSI_POTONG, maksimum: 1500 }));
  assert.notEqual(a, versiPemrosesan("gemini-embedding-001", "ocr-v1", OPSI_POTONG, "kepala-v2"));
});

test("peringatan project Google: label sama (tanpa membedakan huruf/spasi) dipakai lebih dari satu kunci", () => {
  assert.deepEqual(proyekGoogleGanda([{ proyekGoogle: "led-ti" }, { proyekGoogle: " LED-TI " }, { proyekGoogle: "lain" }, { proyekGoogle: null }]), ["led-ti"]);
  assert.deepEqual(proyekGoogleGanda([{ proyekGoogle: "a" }, { proyekGoogle: "b" }]), []);
});
