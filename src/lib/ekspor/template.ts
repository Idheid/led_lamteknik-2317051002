import {
  bacaIndentasiPenomoran, adaKotak, adaSectPr, bernomor, gabungBody, gaya, indentEfektif, normal, PARAGRAF_PEMISAH_HALAMAN, paragrafPlaceholder,
  pecahBody, pemisahHalaman, setelTeks, teksElemen, teksKotak, type Elemen,
} from './xml';

/**
 * Penyiapan template LEDPS (keputusan 2 Okt 2026: narasi MENGGANTIKAN kotak isian). Untuk setiap sub-bagian:
 * paragraf instruksi ("Bagian ini ..."), catatan biru "(… disampaikan oleh pengusul …)", paragraf kotak teks, dan
 * paragraf kosong di bawah judul diganti satu placeholder {{kode}}; judul dan penomoran template tidak disentuh.
 * Bila paragraf instruksi sendiri bernomor (I./II.), paragrafnya dipertahankan dan teksnya diganti judul singkat.
 * Sub-bagian yang tidak berlaku untuk jenjang proyek dihapus beserta judulnya. Pemisah halaman/bagian dipertahankan.
 * Titik temu template ↔ instrumen = teks instruksi (sumberInstruksi "template"), dicari berurutan.
 */

export interface SubTemplate {
  kode: string;
  judul: string;
  tipe: string;
  /** Semua varian instruksi (semua jenjang): paragraf varian lain ikut dihapus. */
  instruksi: string[];
  berlaku: boolean;
}

export interface LaporanTemplate {
  placeholder: string[];
  dihapus: string[];
  tidakDitemukan: string[];
}

/** Sub-bagian yang instruksinya dibuat sistem: jangkar = judul besar di template. */
export const JUDUL_JANGKAR: Record<string, string> = {
  'AWAL-PENGANTAR': 'KATA PENGANTAR',
  'AWAL-RINGKASAN': 'RINGKASAN EKSEKUTIF',
  'I-1': 'BAB I PENDAHULUAN',
};

/** Diisi langsung dari data proyek (bukan placeholder). */
export const SUB_DATA_LANGSUNG = new Set(['AWAL-MUKA', 'AWAL-IDENTITAS', 'AWAL-TIM', 'AWAL-DAFTARISI']);

// catatan biru; termasuk sambungan baris "/ Sarjana Terapan / Magister ...)." yang terpecah ke paragraf baru
const CATATAN = /disampaikan oleh pengusul|^\(?\s*(diisi|penjelasan|data dan analisis|khusus\s+\w+\s*:)|^\/\s*(diploma|sarjana|magister|doktor|profesi)/i;

const PANJANG_KUNCI = 110;

function kunciInstruksi(s: SubTemplate): string[] {
  return s.instruksi.map((x) => normal(x).slice(0, PANJANG_KUNCI)).filter((k) => k.length >= 15);
}

/** Banyak instruksi berawalan sama ("Bagian ini menjelaskan data dan analisis terkait ..."), jadi kunci dibuat panjang. */
function cocokInstruksi(teks: string, kunci: string[]): boolean {
  const n = normal(teks);
  if (n.length < 15) return false;
  return kunci.some((k) => n.startsWith(k) || (n.length >= 40 && k.startsWith(n.slice(0, PANJANG_KUNCI))));
}

/** Instruksi tanpa awalan baku; dipakai bila template tidak punya paragraf instruksi dan judulnyalah sub-bagian itu. */
function kunciJudul(s: SubTemplate): string[] {
  const awalan = /^(bagian ini (menjelaskan|mendeskripsikan|berisi(kan)?|mencakup|mengidentifikasi)( data dan analisis terkait)?|berisi)\s+/i;
  return [...s.instruksi.map((x) => x.replace(awalan, '')), s.judul]
    .map((x) => normal(x).slice(0, 60))
    .filter((k) => k.length >= 12);
}

function cocokJudul(teks: string, kunci: string[]): boolean {
  const n = normal(teks);
  if (n.length < 8) return false;
  // judul kelompok yang pendek ("Proses pembelajaran") tidak boleh dianggap judul sub-bagian yang lebih panjang
  return kunci.some((k) => n.startsWith(k) || (k.startsWith(n.slice(0, 60)) && n.length >= Math.min(k.length, 30)));
}

/** Judul singkat untuk paragraf instruksi bernomor ("Sistem Tata Pamong: Good University Governance" → bagian setelah titik dua). */
export function judulSingkat(judul: string): string {
  const i = judul.indexOf(': ');
  const t = i > 0 ? judul.slice(i + 2) : judul;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

interface Info {
  teks: string;
  kotak: string;
  num: boolean;
  sect: boolean;
  halaman: boolean;
  kotakAda: boolean;
  gaya: string;
}

function infoElemen(e: Elemen): Info {
  if (e.tag !== 'p') return { teks: '', kotak: '', num: false, sect: false, halaman: false, kotakAda: false, gaya: '' };
  return {
    teks: teksElemen(e.xml),
    kotak: teksKotak(e.xml),
    num: bernomor(e.xml),
    sect: adaSectPr(e.xml),
    halaman: pemisahHalaman(e.xml),
    kotakAda: adaKotak(e.xml),
    gaya: gaya(e.xml),
  };
}

interface Rencana {
  kode: string;
  mulai: number;
  akhir: number; // eksklusif
  jangkarBernomor: boolean;
  judulSaja: boolean;
  berlaku: boolean;
  judul: string;
  indent: number;
}

/** Siapkan document.xml: placeholder per sub-bagian, hapus yang tidak berlaku, tambahkan Daftar Tabel/Gambar. */
export function siapkanDokumen(documentXml: string, sub: SubTemplate[], numberingXml = ''): { xml: string; indentasi: Record<string, number>; laporan: LaporanTemplate } {
  const { awal, elemen, akhir } = pecahBody(documentXml);
  const info = elemen.map(infoElemen);
  const penomoran = bacaIndentasiPenomoran(numberingXml);
  const laporan: LaporanTemplate = { placeholder: [], dihapus: [], tidakDitemukan: [] };
  const rencana: Rencana[] = [];
  let posisi = 0;
  const judulSaja = new Set<string>();

  for (const s of sub) {
    if (SUB_DATA_LANGSUNG.has(s.kode) || s.tipe === 'otomatis') continue;
    let jangkar = -1;
    let mulai = -1;
    const judulJangkar = JUDUL_JANGKAR[s.kode];
    if (judulJangkar) {
      const h = info.findIndex((x, i) => i >= posisi && normal(x.teks) === normal(judulJangkar));
      if (h >= 0) {
        jangkar = h;
        mulai = h + 1;
      }
    } else {
      const kunci = kunciInstruksi(s);
      const iInstruksi = kunci.length > 0
        ? info.findIndex((x, i) => i >= posisi && elemen[i].tag === 'p' && (cocokInstruksi(x.teks, kunci) || cocokInstruksi(x.kotak, kunci)))
        : -1;
      // judul bernomor yang menjadi sub-bagian (tanpa paragraf instruksi), dicari sebelum instruksi berikutnya
      const kj = kunciJudul(s);
      const iJudul = info.findIndex((x, i) => i >= posisi && (iInstruksi < 0 || i < iInstruksi) && x.num && cocokJudul(x.teks, kj));
      if (iJudul >= 0 && (iInstruksi < 0 || !info.slice(iJudul + 1, iInstruksi).every((x) => !x.num))) {
        jangkar = iJudul;
        mulai = iJudul + 1;
        judulSaja.add(s.kode);
      } else {
        jangkar = iInstruksi;
        mulai = iInstruksi;
      }
    }
    if (jangkar < 0) {
      laporan.tidakDitemukan.push(s.kode);
      continue;
    }
    const jangkarBernomor = !judulJangkar && !judulSaja.has(s.kode) && info[jangkar].num;
    if (jangkarBernomor) mulai = jangkar + 1;
    // perluas: catatan, kotak teks, paragraf kosong, dan varian instruksi lain milik sub-bagian ini
    const kunci = kunciInstruksi(s);
    const penuh = s.instruksi.map(normal);
    let j = Math.max(mulai, jangkar + 1);
    while (j < elemen.length) {
      const x = info[j];
      if (elemen[j].tag !== 'p' || x.num) break;
      // lanjutan instruksi yang terpecah ke beberapa paragraf ("(4) Memberikan dampak ...") juga dibuang
      const lanjutan = normal(x.teks).length >= 10 && penuh.some((f) => f.includes(normal(x.teks)));
      const pengisi = x.teks === '' || CATATAN.test(x.teks) || x.kotakAda || cocokInstruksi(x.teks, kunci) || lanjutan;
      if (!pengisi) break;
      j += 1;
      if (x.sect) break;
    }
    // narasi sejajar dengan teks judul/instruksi yang digantikan (indentasi bisa berasal dari definisi penomoran)
    const indent = indentEfektif(elemen[jangkar].xml, penomoran) || (jangkarBernomor || judulSaja.has(s.kode) ? 720 : 0);
    rencana.push({ kode: s.kode, mulai, akhir: j, jangkarBernomor, judulSaja: judulSaja.has(s.kode), berlaku: s.berlaku, judul: s.judul, indent });
    posisi = j;
  }

  // susun ulang elemen
  const hapus = new Set<number>();
  const sisipSebelum = new Map<number, string>();
  const ubah = new Map<number, string>();
  const indentasi: Record<string, number> = {};
  for (const r of rencana) {
    const simpan = elemen.slice(r.mulai, r.akhir).filter((e, k) => {
      const x = info[r.mulai + k];
      return x.sect || x.halaman;
    }).map((e) => (info[elemen.indexOf(e)].sect ? hanyaSectPr(e.xml) : PARAGRAF_PEMISAH_HALAMAN)).join('');
    for (let k = r.mulai; k < r.akhir; k++) hapus.add(k);
    if (r.berlaku) {
      sisipSebelum.set(r.mulai, paragrafPlaceholder(r.kode, r.indent) + simpan);
      if (r.jangkarBernomor) ubah.set(r.mulai - 1, setelTeks(elemen[r.mulai - 1].xml, judulSingkat(r.judul)));
      indentasi[r.kode] = r.indent;
      laporan.placeholder.push(r.kode);
    } else {
      if (simpan) sisipSebelum.set(r.mulai, simpan);
      if (r.jangkarBernomor || r.judulSaja) hapus.add(r.mulai - 1);
      else {
        // judul bernomor tepat sebelum instruksi milik sub-bagian ini ikut dihapus
        let h = r.mulai - 1;
        while (h > 0 && info[h].teks === '' && !info[h].num && !info[h].sect) h -= 1;
        const nj = normal(judulSingkat(r.judul));
        const nt = normal(info[h].teks);
        if (info[h].num && nt.length > 3 && (nj.startsWith(nt.slice(0, 20)) || nt.startsWith(nj.slice(0, 20)))) hapus.add(h);
      }
      laporan.dihapus.push(r.kode);
    }
  }

  const hasil: Elemen[] = [];
  elemen.forEach((e, i) => {
    const sisip = sisipSebelum.get(i);
    if (sisip) hasil.push({ tag: 'p', xml: sisip });
    if (!hapus.has(i)) hasil.push(ubah.has(i) ? { ...e, xml: ubah.get(i)! } : e);
  });
  // rencana yang akhirnya di ujung dokumen
  const ujung = sisipSebelum.get(elemen.length);
  if (ujung) hasil.push({ tag: 'p', xml: ujung });

  return { xml: gabungBody(awal, sisipkanDaftarTabelGambar(hasil), akhir), indentasi, laporan };
}

/** Paragraf pemisah bagian tanpa isinya (kotak teks dsb.): hanya pPr yang memuat sectPr. */
function hanyaSectPr(xml: string): string {
  const m = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(xml);
  return m ? `<w:p>${m[0]}</w:p>` : xml;
}

function bersihkanJudul(xml: string): string {
  return xml
    .replace(/<w:bookmark(Start|End)\b[^>]*\/>/g, '')
    .replace(/\s(w14:paraId|w14:textId)="[^"]*"/g, '');
}

/** Daftar Tabel dan Daftar Gambar setelah Daftar Isi (sebelum pemisah bagian), memakai gaya judul Daftar Isi. */
function sisipkanDaftarTabelGambar(elemen: Elemen[]): Elemen[] {
  const iJudul = elemen.findIndex((e) => e.tag === 'p' && normal(teksElemen(e.xml)) === 'daftarisi');
  if (iJudul < 0) return elemen;
  const iSect = elemen.findIndex((e, i) => i > iJudul && e.tag === 'p' && adaSectPr(e.xml));
  if (iSect < 0) return elemen;
  const judul = bersihkanJudul(elemen[iJudul].xml).replace(/<w:pageBreakBefore\/>/g, '');
  const blok = [
    PARAGRAF_PEMISAH_HALAMAN,
    setelTeks(judul, 'DAFTAR TABEL'),
    paragrafPlaceholder('DAFTAR-TABEL', 0),
    PARAGRAF_PEMISAH_HALAMAN,
    setelTeks(judul, 'DAFTAR GAMBAR'),
    paragrafPlaceholder('DAFTAR-GAMBAR', 0),
  ].join('');
  return [...elemen.slice(0, iSect), { tag: 'p', xml: blok }, ...elemen.slice(iSect)];
}

/** Minta Word memperbarui semua field (daftar isi/tabel/gambar) saat dokumen dibuka. */
export function aktifkanPerbaruiField(settingsXml: string): string {
  if (settingsXml.includes('<w:updateFields')) return settingsXml;
  return settingsXml.replace(/(<w:settings\b[^>]*>)/, '$1<w:updateFields w:val="true"/>');
}
