/**
 * Periksa penyiapan template LEDPS terhadap data instrumen (tanpa basis data):
 *   npx tsx scripts/cek-template-led.ts [jenjang] [keluaran.docx]
 * Mencetak sub-bagian yang mendapat placeholder, dihapus, dan tidak ditemukan; opsional menulis template siap-isi.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { aktifkanPerbaruiField, siapkanDokumen, type SubTemplate } from "../src/modules/led/ekspor/template";
import { berlakuUntukJenjang } from "../src/modules/led/domain/instrumen";

const jenjang = process.argv[2] ?? "S1";
const keluaran = process.argv[3];
const jalur = process.env.TEMPLATE_LEDPS_PATH ?? "";
if (!jalur) throw new Error("TEMPLATE_LEDPS_PATH belum diisi di .env");

const seed = JSON.parse(readFileSync(resolve("data/instrumen/lamteknik-2025-pasca.json"), "utf8")) as {
  bagian: { subBagian: { kode: string; judul: string; tipe: string; varian: { instruksi: string }[]; berlakuUntuk: string[]; jenjangOverride?: string[] }[] }[];
};
const sub: SubTemplate[] = seed.bagian.flatMap((b) => b.subBagian.map((s) => ({
  kode: s.kode,
  judul: s.judul,
  tipe: s.tipe,
  instruksi: s.varian.map((v) => v.instruksi).filter(Boolean),
  berlaku: berlakuUntukJenjang({ berlakuUntuk: s.berlakuUntuk, jenjangOverride: s.jenjangOverride ?? [] }, jenjang),
})));

async function main() {
  const zip = await JSZip.loadAsync(readFileSync(resolve(jalur)));
  const doc = await zip.file("word/document.xml")!.async("string");
  const t0 = Date.now();
  const h = siapkanDokumen(doc, sub, (await zip.file("word/numbering.xml")?.async("string")) ?? "");
  console.log(`Jenjang ${jenjang}: ${h.laporan.placeholder.length} placeholder, ${h.laporan.dihapus.length} dihapus, ${h.laporan.tidakDitemukan.length} tidak ditemukan (${Date.now() - t0} ms)`);
  console.log("Dihapus:", h.laporan.dihapus.join(", ") || "-");
  console.log("Tidak ditemukan:", h.laporan.tidakDitemukan.join(", ") || "-");
  if (keluaran) {
    zip.file("word/document.xml", h.xml);
    zip.file("word/settings.xml", aktifkanPerbaruiField(await zip.file("word/settings.xml")!.async("string")));
    writeFileSync(keluaran, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
    console.log("Ditulis:", keluaran);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
