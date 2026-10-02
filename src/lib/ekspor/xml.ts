/**
 * Utilitas XML WordprocessingML untuk menyiapkan dan mengisi template LEDPS (iterasi 4). Bekerja langsung pada
 * teks XML (template resmi ±1,4 MB) tanpa mengubah bagian yang tidak disentuh, supaya gaya, penomoran, header/footer,
 * dan logo template tetap utuh.
 */

export interface Elemen {
  tag: 'p' | 'tbl' | 'sdt';
  xml: string;
}

/** Pecah isi <w:body> menjadi elemen tingkat atas (paragraf, tabel, sdt); sisa (sectPr akhir) dikembalikan terpisah. */
export function pecahBody(documentXml: string): { awal: string; elemen: Elemen[]; akhir: string } {
  const buka = documentXml.indexOf('<w:body>');
  const tutup = documentXml.lastIndexOf('</w:body>');
  if (buka < 0 || tutup < 0) throw new Error('document.xml tidak memuat <w:body>.');
  const body = documentXml.slice(buka + 8, tutup);
  const elemen: Elemen[] = [];
  const re = /<w:(p|tbl|sdt)(?=[\s>/])/g;
  let pos = 0;
  let sisa = '';
  for (;;) {
    re.lastIndex = pos;
    const m = re.exec(body);
    if (!m) {
      sisa = body.slice(pos);
      break;
    }
    if (body.slice(pos, m.index).trim()) {
      // teks di antara elemen (mis. bookmark tingkat atas) ditempel ke elemen sebelumnya
      if (elemen.length) elemen[elemen.length - 1].xml += body.slice(pos, m.index);
    }
    const tag = m[1] as Elemen['tag'];
    const akhir = cariPenutup(body, m.index, tag);
    elemen.push({ tag, xml: body.slice(m.index, akhir) });
    pos = akhir;
  }
  return { awal: documentXml.slice(0, buka + 8), elemen, akhir: sisa + documentXml.slice(tutup) };
}

function cariPenutup(s: string, mulai: number, tag: string): number {
  const re = new RegExp(`<(/?)w:${tag}(?=[\\s>/])[^>]*?(/?)>`, 'g');
  re.lastIndex = mulai;
  let d = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m[1]) d -= 1;
    else if (!m[2]) d += 1;
    else if (d === 0) return m.index + m[0].length; // <w:p/> tingkat atas
    if (d === 0) return m.index + m[0].length;
  }
  throw new Error(`Elemen w:${tag} tidak tertutup.`);
}

export function gabungBody(awal: string, elemen: Elemen[], akhir: string): string {
  return awal + elemen.map((e) => e.xml).join('') + akhir;
}

/** Buang isi kotak teks dan duplikat AlternateContent supaya teks paragraf utama tidak tercampur. */
function tanpaKotak(xml: string): string {
  return xml
    .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '')
    .replace(/<w:txbxContent>[\s\S]*?<\/w:txbxContent>/g, '');
}

function nodeTeks(xml: string): string {
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
}

export function dekode(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

export function enkode(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Teks paragraf utama (tanpa isi kotak teks). */
export function teksElemen(xml: string): string {
  return dekode(nodeTeks(tanpaKotak(xml))).trim();
}

/** Teks di dalam kotak teks (sekali, tanpa duplikat Fallback). */
export function teksKotak(xml: string): string {
  const x = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
  return [...x.matchAll(/<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g)].map((m) => dekode(nodeTeks(m[1]))).join(' ').trim();
}

function pPr(xml: string): string {
  const m = /^<w:p\b[^>]*>(\s*<w:pPr>[\s\S]*?<\/w:pPr>)?/.exec(xml);
  return m?.[1] ?? '';
}

export function gaya(xml: string): string {
  return /<w:pStyle w:val="([^"]+)"/.exec(pPr(xml))?.[1] ?? '';
}

/** Paragraf bernomor (penomoran otomatis Word: "a.", "i.", "I.", "1)"). */
export function bernomor(xml: string): boolean {
  return pPr(xml).includes('<w:numPr>');
}

export function adaKotak(xml: string): boolean {
  return /<wps:wsp\b|<v:textbox\b|<w:txbxContent>/.test(xml);
}

export function adaGambar(xml: string): boolean {
  return /<pic:pic\b|<v:imagedata\b/.test(xml);
}

export function pemisahHalaman(xml: string): boolean {
  return /<w:br w:type="page"\/>/.test(xml) || /<w:pageBreakBefore\/>/.test(pPr(xml));
}

export function adaSectPr(xml: string): boolean {
  return pPr(xml).includes('<w:sectPr');
}

export function indentKiri(xml: string): number {
  const m = /<w:ind\b[^>]*\bw:(?:left|start)="(-?\d+)"/.exec(pPr(xml));
  return m ? Number(m[1]) : 0;
}

/** Huruf/angka saja, huruf kecil: untuk mencocokkan teks template dengan teks instrumen. */
export function normal(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
}

/**
 * Ganti teks di dalam satu paragraf walau terpecah di beberapa <w:t>: pola dicocokkan pada teks gabungan, hasil
 * ditulis ke node teks pertama yang tersentuh, node lain yang tersentuh dikosongkan. Format run tetap.
 * Hanya node di luar kotak teks yang disentuh kecuali `termasukKotak`.
 */
export function gantiTeks(xml: string, pola: RegExp, pengganti: (cocok: RegExpExecArray) => string, opsi: { termasukKotak?: boolean } = {}): string {
  const node: { mulai: number; akhir: number; isiMulai: number; isiAkhir: number; teks: string }[] = [];
  const terlarang: [number, number][] = [];
  if (!opsi.termasukKotak) {
    for (const m of xml.matchAll(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>|<w:txbxContent>[\s\S]*?<\/w:txbxContent>/g)) {
      terlarang.push([m.index!, m.index! + m[0].length]);
    }
  }
  for (const m of xml.matchAll(/(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g)) {
    const i = m.index!;
    if (terlarang.some(([a, b]) => i >= a && i < b)) continue;
    node.push({ mulai: i, akhir: i + m[0].length, isiMulai: i + m[1].length, isiAkhir: i + m[1].length + m[2].length, teks: dekode(m[2]) });
  }
  const gabung = node.map((n) => n.teks).join('');
  const re = new RegExp(pola.source, pola.flags.replace('g', ''));
  const c = re.exec(gabung);
  if (!c) return xml;
  const awal = c.index;
  const akhir = c.index + c[0].length;
  const baru = pengganti(c);
  // susun isi baru per node
  let pos = 0;
  const isiBaru: string[] = [];
  let ditulis = false;
  for (const n of node) {
    const a = pos;
    const b = pos + n.teks.length;
    pos = b;
    if (b <= awal || a >= akhir || (a === b && !(a >= awal && a < akhir))) {
      isiBaru.push(n.teks);
      continue;
    }
    const kiri = n.teks.slice(0, Math.max(0, awal - a));
    const kanan = n.teks.slice(Math.max(0, Math.min(n.teks.length, akhir - a)));
    isiBaru.push(kiri + (ditulis ? '' : baru) + kanan);
    ditulis = true;
  }
  if (!ditulis) return xml;
  let hasil = '';
  let terakhir = 0;
  node.forEach((n, i) => {
    hasil += xml.slice(terakhir, n.isiMulai) + enkode(isiBaru[i]);
    terakhir = n.isiAkhir;
  });
  hasil += xml.slice(terakhir);
  // pastikan spasi di awal/akhir tetap (xml:space="preserve")
  return hasil.replace(/<w:t>([^<]*)<\/w:t>/g, (s, t: string) => (/^\s|\s$/.test(t) ? `<w:t xml:space="preserve">${t}</w:t>` : s));
}

/** Paragraf polos berisi satu placeholder {{kode}} dengan indentasi kiri tertentu. */
export function paragrafPlaceholder(kode: string, indent: number): string {
  const ppr = indent ? `<w:pPr><w:ind w:left="${indent}"/></w:pPr>` : '';
  return `<w:p>${ppr}<w:r><w:t xml:space="preserve">{{${kode}}}</w:t></w:r></w:p>`;
}

export const PARAGRAF_PEMISAH_HALAMAN = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/** Ganti seluruh teks paragraf (format run pertama dipakai). */
export function setelTeks(xml: string, teks: string): string {
  return gantiTeks(xml, /^[\s\S]*$/, () => teks);
}
