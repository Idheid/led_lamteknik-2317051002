/**
 * D8 (desain form 2, 2 Nov 2026): logo perguruan tinggi di halaman muka LED. Template LAM Teknik memakai bentuk
 * lingkaran bertulisan "Logo Perguruan Tinggi" (grup DrawingML di dalam mc:AlternateContent, dengan cadangan VML).
 * Seluruh bentuk itu diganti satu gambar yang posisinya sama: ukuran disesuaikan agar muat di kotak bentuk asal
 * (rasio dipertahankan) dan diletakkan di tengahnya. Fungsi di sini murni (string XML), tanpa I/O.
 */

export type JenisGambar = "png" | "jpeg";

export interface InfoGambar {
  jenis: JenisGambar;
  lebar: number;
  tinggi: number;
}

/** Jenis dan ukuran piksel PNG/JPEG dari isi berkas; null bila bukan PNG/JPEG yang terbaca. */
export function infoGambar(b: Buffer): InfoGambar | null {
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString("ascii", 12, 16) === "IHDR") {
    const lebar = b.readUInt32BE(16);
    const tinggi = b.readUInt32BE(20);
    return lebar > 0 && tinggi > 0 ? { jenis: "png", lebar, tinggi } : null;
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const penanda = b[i + 1];
      if (penanda === 0xd8 || penanda === 0x01 || (penanda >= 0xd0 && penanda <= 0xd7)) { i += 2; continue; }
      const panjang = b.readUInt16BE(i + 2);
      // SOF0–SOF15 kecuali DHT (C4), JPG (C8), DAC (CC)
      if (penanda >= 0xc0 && penanda <= 0xcf && penanda !== 0xc4 && penanda !== 0xc8 && penanda !== 0xcc) {
        const tinggi = b.readUInt16BE(i + 5);
        const lebar = b.readUInt16BE(i + 7);
        return lebar > 0 && tinggi > 0 ? { jenis: "jpeg", lebar, tinggi } : null;
      }
      i += 2 + panjang;
    }
  }
  return null;
}

const TEKS_LOGO = /Logo\s*Perguruan\s*Tinggi/;

/** Rentang [awal, akhir) setiap pasangan tag terluar `nama` yang mengandung posisi `pos` (bersarang dihitung). */
function rentangTerluar(xml: string, nama: string, pos: number): [number, number] | null {
  const pola = new RegExp(`<(/?)${nama}\\b[^>]*?(/?)>`, "g");
  const tumpukan: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = pola.exec(xml))) {
    if (m[2] === "/") continue;
    if (m[1] !== "/") { tumpukan.push(m.index); continue; }
    const awal = tumpukan.pop();
    const akhir = m.index + m[0].length;
    if (awal === undefined) continue;
    if (tumpukan.length === 0 && awal <= pos && pos < akhir) return [awal, akhir];
    if (m.index > pos && tumpukan.length === 0) return null;
  }
  return null;
}

/** Bentuk "Logo Perguruan Tinggi" di halaman muka: rentang XML yang akan diganti gambar. */
export function cariBentukLogo(xml: string): [number, number] | null {
  const m = TEKS_LOGO.exec(xml.replace(/<[^>]+>/g, (t) => " ".repeat(t.length)));
  if (!m) return null;
  return rentangTerluar(xml, "mc:AlternateContent", m.index)
    ?? rentangTerluar(xml, "w:drawing", m.index)
    ?? rentangTerluar(xml, "w:pict", m.index);
}

function angka(xml: string, pola: RegExp): number | null {
  const m = pola.exec(xml);
  return m ? Number(m[1]) : null;
}

/** XML gambar pengganti (wp:anchor bila bentuk asal mengambang, wp:inline bila tidak). */
export function xmlGambarLogo(bentuk: string, rId: string, g: InfoGambar): string {
  const kotakX = angka(bentuk, /<wp:extent cx="(\d+)"/) ?? 1800000;
  const kotakY = angka(bentuk, /<wp:extent cx="\d+" cy="(\d+)"/) ?? 1800000;
  const skala = Math.min(kotakX / g.lebar, kotakY / g.tinggi);
  const cx = Math.round(g.lebar * skala);
  const cy = Math.round(g.tinggi * skala);
  const grafik = `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Logo Perguruan Tinggi"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  const docPr = `<wp:docPr id="90001" name="Logo Perguruan Tinggi"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>`;
  const ukuran = `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`;
  const posH = /<wp:positionH\b[\s\S]*?<\/wp:positionH>/.exec(bentuk)?.[0];
  const posV = /<wp:positionV\b[\s\S]*?<\/wp:positionV>/.exec(bentuk)?.[0];
  if (!/<wp:anchor\b/.test(bentuk) || !posH || !posV) {
    return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">${ukuran}${docPr}${grafik}</wp:inline></w:drawing>`;
  }
  // geser ke tengah kotak bentuk asal
  const geser = (pos: string, selisih: number) => pos.replace(/<wp:posOffset>(-?\d+)<\/wp:posOffset>/, (_, v) => `<wp:posOffset>${Number(v) + Math.round(selisih / 2)}</wp:posOffset>`);
  const relatif = /relativeHeight="(\d+)"/.exec(bentuk)?.[1] ?? "251659264";
  return `<w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${relatif}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>${geser(posH, kotakX - cx)}${geser(posV, kotakY - cy)}${ukuran}<wp:wrapTopAndBottom/>${docPr}${grafik}</wp:anchor></w:drawing>`;
}

export const RID_LOGO = "rIdLogoSampul";

export interface HasilSisipLogo {
  document: string;
  rels: string;
  contentTypes: string;
  /** jalur berkas gambar di dalam paket .docx */
  media: string;
}

/** Ganti bentuk logo di halaman muka; null bila template tidak punya bentuk "Logo Perguruan Tinggi". */
export function sisipkanLogo(document: string, rels: string, contentTypes: string, g: InfoGambar): HasilSisipLogo | null {
  const r = cariBentukLogo(document);
  if (!r) return null;
  const ekstensi = g.jenis === "png" ? "png" : "jpeg";
  const media = `word/media/logo-sampul.${ekstensi}`;
  const doc = document.slice(0, r[0]) + xmlGambarLogo(document.slice(r[0], r[1]), RID_LOGO, g) + document.slice(r[1]);
  const relBaru = rels.includes(`Id="${RID_LOGO}"`) ? rels : rels.replace(
    "</Relationships>",
    `<Relationship Id="${RID_LOGO}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo-sampul.${ekstensi}"/></Relationships>`,
  );
  const ct = new RegExp(`<Default Extension="${ekstensi}"`, "i").test(contentTypes) ? contentTypes : contentTypes.replace(
    /<Types\b[^>]*>/,
    (t) => `${t}<Default Extension="${ekstensi}" ContentType="image/${ekstensi}"/>`,
  );
  return { document: doc, rels: relBaru, contentTypes: ct, media };
}
