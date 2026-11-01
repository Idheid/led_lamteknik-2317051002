import { createHash } from "node:crypto";
import { bacaHalamanPdf } from "@/modules/led/instrumen/pdf";
import { bacaParagrafTemplate } from "@/modules/led/instrumen/template";
import { susunMatriks } from "@/modules/led/domain/matriks";
import { uraiTemplate, type ParagrafTemplate } from "@/modules/led/domain/template-led";
import {
  jenisDocx, jenisPdf, jenjangDariMatriks, kriteriaDariKonteks, kriteriaTemplateCadangan, tahunDariTeks, teksKunciMatriks,
  type BacaanBerkas, type JenisBerkas,
} from "@/modules/led/domain/periksa-berkas-instrumen";
import type { HalamanTeks } from "@/modules/led/domain/tata-letak-pdf";
import { diagnosisTemplate, type DiagnosisTemplate } from "@/modules/led/domain/diagnosis-template";

/**
 * Baca isi berkas instrumen untuk pemeriksaan saat diunggah (perbaikan 2 Nov 2026, I1): paragraf .docx dan teks
 * halaman PDF, tanpa AI dan tanpa metadata berkas. Cukup cepat untuk dijalankan sinkron saat unggah.
 */

export function sha256(isi: Buffer | Uint8Array): string {
  return createHash("sha256").update(isi).digest("hex");
}

function teksHalaman(h: HalamanTeks): string {
  return [...h.item].sort((a, b) => b.y - a.y || a.x - b.x).map((i) => i.teks).join(" ");
}

function ringkas(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Kriteria template: aturan bawaan (gaya "C.1. ..."), lalu cara cadangan bila formatnya lain. */
export function kriteriaTemplate(paragraf: ParagrafTemplate[]): string[] {
  const bawaan = uraiTemplate(paragraf).filter((b) => b.jenis === "kriteria").map((b) => b.nama);
  return bawaan.length ? bawaan : kriteriaTemplateCadangan(paragraf);
}

export async function bacaDocx(isi: Buffer): Promise<BacaanBerkas & { paragraf: ParagrafTemplate[] }> {
  const sidik = sha256(isi);
  let paragraf: ParagrafTemplate[];
  try {
    paragraf = await bacaParagrafTemplate(isi);
  } catch {
    return { jenis: "rusak", sha256: sidik, judulAwal: "", tahun: null, jenjang: null, kriteria: null, paragraf: [] };
  }
  const awal = paragraf.map((p) => p.teks.trim()).filter(Boolean).slice(0, 12);
  const jenis = jenisDocx(awal);
  return {
    jenis, sha256: sidik, judulAwal: ringkas(awal.slice(0, 3).join(" · ")), tahun: null, jenjang: null,
    kriteria: jenis === "template" ? kriteriaTemplate(paragraf) : null, paragraf,
  };
}

export async function bacaPdf(isi: Buffer, opsi: { lengkap?: boolean } = {}): Promise<BacaanBerkas> {
  const sidik = sha256(isi);
  if (isi.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return { jenis: "bukan-pdf", sha256: sidik, judulAwal: "", tahun: null, jenjang: null, kriteria: null };
  }
  let awal: HalamanTeks[];
  try {
    awal = (await bacaHalamanPdf(isi, [1, 2, 3])).halaman;
  } catch {
    return { jenis: "rusak", sha256: sidik, judulAwal: "", tahun: null, jenjang: null, kriteria: null };
  }
  const teks = awal.map(teksHalaman).join("\n");
  const jenis = jenisPdf(teks);
  const hasil: BacaanBerkas = { jenis, sha256: sidik, judulAwal: ringkas(teks), tahun: tahunDariTeks(teks), jenjang: null, kriteria: null };
  if (jenis === "matriks") {
    hasil.jenjang = jenjangDariMatriks(teks);
    if (opsi.lengkap !== false) {
      const { halaman } = await bacaHalamanPdf(isi);
      hasil.kriteria = kriteriaDariKonteks(susunMatriks(halaman).baris.map((b) => b.konteks));
      hasil.teksKunci = teksKunciMatriks(halaman.map(teksHalaman).join(" "));
    }
  }
  return hasil;
}

/** Template LED beserta diagnosis pembacaannya (I2). */
export async function bacaTemplate(isi: Buffer, opsi: { jenjang: string | null; tahun: number }): Promise<{ bacaan: BacaanBerkas; diagnosis: DiagnosisTemplate }> {
  const { paragraf, ...bacaan } = await bacaDocx(isi);
  const terbuka = bacaan.jenis === "rusak" ? null : paragraf;
  return { bacaan, diagnosis: diagnosisTemplate(terbuka, terbuka ? uraiTemplate(terbuka) : [], opsi) };
}

/** Baca berkas sesuai baris unggahnya (template .docx, matriks/pedoman .pdf). */
export async function bacaBerkasInstrumen(jenis: JenisBerkas, isi: Buffer): Promise<BacaanBerkas> {
  if (jenis === "template") {
    const { paragraf: _p, ...b } = await bacaDocx(isi);
    return b;
  }
  // berkas .docx yang diunggah di baris PDF: sebutkan jenisnya bila bisa dikenali
  if (isi.subarray(0, 2).toString("latin1") === "PK") {
    const { paragraf: _p, ...b } = await bacaDocx(isi);
    return { ...b, jenis: b.jenis === "rusak" ? "bukan-pdf" : b.jenis, kriteria: null };
  }
  return bacaPdf(isi);
}
