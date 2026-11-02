/**
 * Bahan evaluasi verifikasi per kalimat (revisi 22 Okt 2026, Bab 4):
 *
 *   npx tsx scripts/sampel-verifikasi.ts ekspor <proyekId> <berkas.csv> [jumlah=50]
 *     Ambil sampel kalimat acak (seed tetap) dari draf aktif satu LED beserta label cek otomatis dan label AI (bila
 *     sudah diperiksa AI). Kolom "label_manual" dikosongkan untuk diisi peneliti: sesuai / sebagian / tidak_didukung.
 *
 *   npx tsx scripts/sampel-verifikasi.ts nilai <berkas.csv>
 *     Hitung kesesuaian label otomatis dan label AI terhadap label manual: akurasi, matriks kebingungan, dan
 *     persentase kalimat sesuai sumber (menurut label manual) sebagai angka faithfulness.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "@/modules/bersama/db";
import { bacaDokumen, type RujukanPeriksa } from "@/modules/led/domain/narasi";
import { periksaKalimat, type LabelKalimat } from "@/modules/led/domain/verifikasi";

const LABEL: LabelKalimat[] = ["sesuai", "sebagian", "tidak_didukung"];

function csv(nilai: (string | number)[]): string {
  return nilai.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",");
}

function bacaCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let sel = "";
  let isi: string[] = [];
  let kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') kutip = false; else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === ",") { isi.push(sel); sel = ""; }
    else if (c === "\n") { isi.push(sel.replace(/\r$/, "")); baris.push(isi); isi = []; sel = ""; }
    else sel += c;
  }
  if (sel || isi.length) { isi.push(sel); baris.push(isi); }
  return baris.filter((b) => b.some((x) => x.trim()));
}

/** Acak deterministik (mulberry32) supaya sampel bisa diulang. */
function acak(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ekspor(proyekId: string, berkas: string, jumlah: number) {
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId, versiAktifId: { not: null } },
    select: { versiAktifId: true, subBagian: { select: { kode: true } } },
  });
  const versi = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } } });
  const semua: string[][] = [];
  for (const d of draf) {
    const v = versi.find((x) => x.id === d.versiAktifId)!;
    const p = (v.pemeriksaan ?? {}) as { rujukan?: RujukanPeriksa; kalimatAi?: { hasil: { teks: string; label: LabelKalimat; alasan: string }[] } };
    const otomatis = periksaKalimat(bacaDokumen(v.isi), p.rujukan?.teksSumber ?? {}, { tahunSah: p.rujukan?.tahunSah ?? [] });
    for (const k of otomatis) {
      const ai = p.kalimatAi?.hasil.find((x) => x.teks === k.teks);
      semua.push([d.subBagian.kode, k.sumber.join(" "), k.teks, k.label, k.alasan, ai?.label ?? "", ai?.alasan ?? "", ""]);
    }
  }
  const r = acak(20261022);
  const sampel = [...semua].sort(() => r() - 0.5).slice(0, jumlah);
  const kepala = ["sub_bagian", "sumber", "kalimat", "label_otomatis", "alasan_otomatis", "label_ai", "alasan_ai", "label_manual"];
  writeFileSync(berkas, `﻿${[kepala, ...sampel].map(csv).join("\n")}\n`, "utf8");
  console.log(`${sampel.length} dari ${semua.length} kalimat ditulis ke ${berkas}. Isi kolom label_manual: ${LABEL.join(" / ")}.`);
}

function nilai(berkas: string) {
  const [kepala, ...baris] = bacaCsv(readFileSync(berkas, "utf8").replace(/^﻿/, ""));
  const kol = (n: string) => kepala.indexOf(n);
  const terisi = baris.filter((b) => LABEL.includes(b[kol("label_manual")]?.trim() as LabelKalimat));
  if (terisi.length === 0) {
    console.log("Belum ada label_manual yang terisi.");
    return;
  }
  const lapor = (nama: string, kolom: string) => {
    const ada = terisi.filter((b) => LABEL.includes(b[kol(kolom)]?.trim() as LabelKalimat));
    if (ada.length === 0) return console.log(`\n${nama}: tidak ada label.`);
    const benar = ada.filter((b) => b[kol(kolom)].trim() === b[kol("label_manual")].trim()).length;
    console.log(`\n${nama}: akurasi ${(100 * benar / ada.length).toFixed(1)}% (${benar}/${ada.length})`);
    console.log(`baris = manual, kolom = ${nama.toLowerCase()}`);
    console.log(["", ...LABEL].map((x) => x.padEnd(15)).join(""));
    for (const m of LABEL) {
      console.log([m, ...LABEL.map((o) => String(ada.filter((b) => b[kol("label_manual")].trim() === m && b[kol(kolom)].trim() === o).length))].map((x) => x.padEnd(15)).join(""));
    }
  };
  const sesuai = terisi.filter((b) => b[kol("label_manual")].trim() === "sesuai").length;
  console.log(`Kalimat berlabel manual: ${terisi.length}; sesuai sumber menurut label manual: ${(100 * sesuai / terisi.length).toFixed(1)}% (faithfulness).`);
  lapor("Cek otomatis", "label_otomatis");
  lapor("Periksa dengan AI", "label_ai");
}

async function utama() {
  const [perintah, a, b, c] = process.argv.slice(2);
  if (perintah === "ekspor" && a && b) await ekspor(a, b, Number(c) || 50);
  else if (perintah === "nilai" && a) nilai(a);
  else console.log("Pakai: ekspor <proyekId> <berkas.csv> [jumlah] | nilai <berkas.csv>");
}

utama().finally(() => prisma.$disconnect());
