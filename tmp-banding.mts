import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "./src/lib/db.ts";
import { kunciTeks } from "./src/lib/domain/template-led.ts";
const V = readFileSync("../led-tmp/versi-ujicoba.txt", "utf8").trim();
const seed = JSON.parse(readFileSync("data/instrumen/lamteknik-2025-pasca.json", "utf8")).butir as any[];
const v = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: V } });
const info = v.ekstraksi as any;
const b = await prisma.butirPenilaian.findMany({ where: { versiId: V }, orderBy: { urutan: "asc" }, include: { subBagian: { include: { subBagian: true } } } });
const log = await prisma.logPemakaian.findMany({ where: { subBagianKode: { startsWith: `instrumen:${v.kode}` } } });
console.log("status", v.status, "| baris", info.jumlahBaris, "| kelompok", info.kelompokSelesai, "/", info.jumlahKelompok, "| butir", b.length);
console.log("panggilan LLM", log.length, "berhasil", log.filter((l) => l.berhasil).length, "| token masuk", log.reduce((n, l) => n + l.tokenMasuk, 0), "keluar", log.reduce((n, l) => n + l.tokenKeluar, 0), "| model", [...new Set(log.map((l) => l.model))].join(","));
const kodeSama = b.filter((x) => seed.some((s) => s.kode === x.kode)).length;
console.log("kode sama", kodeSama, "/", seed.length, "| kode tidak di bawaan:", b.filter((x) => !seed.some((s) => s.kode === x.kode)).map((x) => x.kode).join(" ") || "-", "| bawaan tidak ada:", seed.filter((s) => !b.some((x) => x.kode === s.kode)).map((s) => s.kode).join(" ") || "-");
const total = b.reduce((n, x) => n + Number(x.bobot), 0);
const bobotBeda = b.filter((x) => { const s = seed.find((y) => y.kode === x.kode); return s && Number(x.bobot) !== s.bobot; });
console.log("total bobot", total.toFixed(2), "| bobot beda:", bobotBeda.map((x) => `${x.kode} ${x.bobot}/${seed.find((y) => y.kode === x.kode).bobot}`).join(", ") || "-");
let jenis = 0, sub = 0, subSebagian = 0, rumus = 0, rumusHarap = 0, d4 = 0, unsur = 0;
const bedaJenis: string[] = [], bedaSub: string[] = [], bedaRumus: string[] = [];
for (const x of b) {
  const s = seed.find((y) => y.kode === x.kode); if (!s) continue;
  if (x.jenis === s.jenis) jenis++; else bedaJenis.push(`${x.kode}:${x.jenis}`);
  const harap = [s.subBagian].flat().sort(); const dapat = x.subBagian.map((y) => y.subBagian.kode).sort();
  if (JSON.stringify(harap) === JSON.stringify(dapat)) sub++; else { if (dapat.some((d) => harap.includes(d))) subSebagian++; bedaSub.push(`${x.kode}:${dapat.join("+") || "-"} (harap ${harap.join("+")})`); }
  const rHarap = s.jenis === "angka" && ["6-I","6-II","9","10","11","18","19","23","25","26","27","28","30","31","32","33","34","35","36","37","40","41","42","43-I","43-II","44","45","46","47","49","50","51","52"].includes(s.kode) ? s.kode : null;
  if (rHarap) rumusHarap++;
  if ((x.kodeRumus ?? null) === rHarap) { if (rHarap) rumus++; } else bedaRumus.push(`${x.kode}:${x.kodeRumus ?? "-"} (harap ${rHarap ?? "-"})`);
  const a = kunciTeks(x.deskriptorSkor4), c = kunciTeks(s.deskriptorSkor4);
  let i = 0; while (i < a.length && i < c.length && a[i] === c[i]) i++;
  if (i >= Math.min(40, a.length, c.length)) d4++;
  if (x.unsurSkor4.length === s.unsurSkor4.length) unsur++;
}
console.log(`jenis sama ${jenis}/${kodeSama} | sub-bagian sama persis ${sub}, sebagian ${subSebagian} | rumus cocok ${rumus}/${rumusHarap} | deskriptor4 awal sama ${d4} | jumlah unsur skor4 sama ${unsur}`);
console.log("jenis beda:", bedaJenis.join(" ") || "-");
console.log("rumus beda:", bedaRumus.join(" ; ") || "-");
console.log("sub-bagian beda:\n  " + bedaSub.join("\n  "));
const contoh = b.find((x) => x.kode === "14-II"); console.log("\ncontoh 14-II:", JSON.stringify({ elemen: contoh?.elemen, indikator: contoh?.indikator, s4: contoh?.deskriptorSkor4?.slice(0, 200), s3: contoh?.deskriptorSkor3?.slice(0, 120), tabel: contoh?.tabelLkps }, null, 1));
const c41 = b.find((x) => x.kode === "41"); console.log("contoh 41:", JSON.stringify({ elemen: c41?.elemen, indikator: c41?.indikator, s4: c41?.deskriptorSkor4, s3: c41?.deskriptorSkor3, tabel: c41?.tabelLkps, jenis: c41?.jenis, rumus: c41?.kodeRumus }));
await prisma.$disconnect(); process.exit(0);
