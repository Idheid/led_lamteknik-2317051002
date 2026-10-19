import { readFileSync } from "node:fs";
import { bacaParagrafTemplate } from "./src/lib/instrumen/template.ts";
import { uraiTemplate, untukJenjang, petakanSubBagian } from "./src/lib/domain/template-led.ts";
import { KODE_JENJANG } from "./src/lib/domain/instrumen.ts";
const p = await bacaParagrafTemplate(readFileSync("tests/fikstur/instrumen/template-ledps-2025.docx"));
const semua = uraiTemplate(p);
const seed = JSON.parse(readFileSync("data/instrumen/lamteknik-2025-pasca.json", "utf8"));
const ruj = seed.bagian.flatMap((b: any) => b.subBagian.map((s: any) => ({ bagianKode: b.kode, kode: s.kode, label: s.label ?? "", judul: s.judul, grup: s.grup, tipe: s.tipe, instruksi: s.varian.map((v: any) => v.instruksi), berlaku: s.berlakuUntuk, jenjangOverride: s.jenjangOverride, var: s.varian })));
for (const j of KODE_JENJANG) {
  const hasil = petakanSubBagian(untukJenjang(semua, j), ruj, { jenjang: j, semuaVarian: semua }).flatMap((x) => x.sub);
  const harap = ruj.filter((r: any) => !/^AWAL/.test(r.kode) && (r.jenjangOverride?.length ? r.jenjangOverride : r.berlaku).includes(j));
  const dapat = hasil.map((h) => h.kode);
  const urutSama = JSON.stringify(dapat) === JSON.stringify(harap.map((r: any) => r.kode));
  // instruksi varian untuk jenjang ini sama dengan seed?
  const instrBeda = hasil.filter((h) => { const r = harap.find((x: any) => x.kode === h.kode); const v = r?.var.find((v: any) => v.jenjang.includes(j)); return r && v && !h.varian[0].instruksi.toLowerCase().startsWith(v.instruksi.toLowerCase().slice(0, 40)); }).map((h) => h.kode);
  console.log(j, "hasil", hasil.length, "harap", harap.length, "hilang", harap.filter((r: any) => !dapat.includes(r.kode)).map((r: any) => r.kode).join(","), "baru", hasil.filter((h) => !h.dariRujukan).map((h) => h.kode).join(","), "urut", urutSama, "instruksiBeda", instrBeda.join(","));
}
const ppi = petakanSubBagian(untukJenjang(semua, "PPI"), ruj, { jenjang: "PPI", semuaVarian: semua }).flatMap((x) => x.sub).filter((h) => /^C\.4-IKU-(baru|a\.(i|ii|iii|iv)$|d)/.test(h.kode));
for (const h of ppi) console.log(h.kode, "<=", h.dariRujukan, "|", h.judul.slice(0, 60), "|", h.varian[0].instruksi.slice(0, 120));
