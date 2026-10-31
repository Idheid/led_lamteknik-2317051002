import { JENJANG } from '../../bersama/domain/jenjang.ts';

/**
 * Penguraian Template LEDPS (.docx) tanpa AI (revisi 19 Okt 2026). Masukan: paragraf tingkat atas berurutan
 * beserta nama gaya, penomoran Word (numId/ilvl), dan tanda kotak isian. Aturan:
 * - "BAB I/II/III/IV", "LAMPIRAN" (gaya judul besar) membuka bagian; di Bab II gaya sub judul membuka II.A, II.B,
 *   dan "Kriteria Akreditasi"; gaya judul kriteria (nama gaya "C.1. ...") membuka C.1, C.2, ...
 * - Paragraf bernomor yang bukan instruksi = judul; kedalamannya dari ilvl (daftar yang baru muncul disambung
 *   ke judul terakhir). Paragraf "I. ..."/"II. ..." pendek tanpa nomor juga judul.
 * - Isi di bawah judul sampai kotak isian = satu blok: instruksi + catatan biru "(… disampaikan oleh pengusul …
 *   pada program X / Y)" yang menentukan jenjang. Blok tanpa instruksi memakai teks judulnya.
 * - Blok berurutan di bawah judul yang sama dengan jenjang berbeda = varian satu sub-bagian; bila jenjangnya
 *   sama (mis. dua-duanya "semua program"), keduanya sub-bagian terpisah (I, II).
 */

export interface ParagrafTemplate {
  teks: string;
  gaya: string;
  numId: string | null;
  ilvl: number;
  kotak: boolean;
  tabel?: boolean;
}

export interface VarianTemplate {
  instruksi: string;
  jenjang: string[];
  catatanTemplate: string | null;
  /** true bila template tidak memuat instruksi dan teks judul dipakai sebagai instruksi */
  dariJudul?: boolean;
}

export type PeranSub = 'LB' | 'KEB' | 'AF' | 'SWOT' | 'IKU' | 'lain';

export interface SubHasilTemplate {
  /** judul-judul di atasnya (tanpa judul bagian), dari luar ke dalam */
  jalur: string[];
  judul: string;
  peran: PeranSub;
  varian: VarianTemplate[];
}

export interface BagianHasilTemplate {
  kode: string;
  nama: string;
  jenis: 'bab' | 'kriteria' | 'butir';
  /** paragraf pembuka bagian sebelum judul pertama (mis. Bab III) */
  pengantar: string | null;
  sub: SubHasilTemplate[];
}

const SEMUA = JENJANG.map((j) => j.kode);
const CATATAN = /disampaikan oleh pengusul|^\(?\s*diisi oleh pengusul|^\/\s*(diploma|sarjana|magister|doktor|profesi|program)/i;
const INSTRUKSI = /^(bagian ini|berisi|pada bagian ini)\b/i;

function rapi(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function bersihJudul(s: string): string {
  return rapi(s).replace(/[.:]\s*$/, '');
}

/** Jenjang dari catatan biru. "untuk semua program" → semua jenjang; "pada program Sarjana / Magister" → [S1, S2]. */
export function jenjangCatatan(catatan: string): string[] {
  const t = rapi(catatan);
  if (/semua program/i.test(t)) return [...SEMUA];
  const m = /pada\s+(?:program\s+)?(.+?)\)?\.?\s*$/i.exec(t) ?? /^\/\s*(.+?)\)?\.?\s*$/.exec(t);
  if (!m) return [...SEMUA];
  const nama = m[1].replace(/\)\.?$/, '').split('/').map((x) => rapi(x).toLowerCase().replace(/^program\s+/, ''));
  const hasil = JENJANG.filter((j) => nama.some((n) => n === j.nama.toLowerCase().replace(/^program\s+/, ''))).map((j) => j.kode);
  return hasil.length ? hasil : [...SEMUA];
}

function peranDariJudul(judul: string): PeranSub {
  const j = judul.toLowerCase();
  if (/^latar belakang/.test(j)) return 'LB';
  if (/^kebijakan/.test(j)) return 'KEB';
  if (/^analisis faktor/.test(j)) return 'AF';
  if (/^strategi perbaikan/.test(j) || /analisis swot\)?$/.test(j)) return 'SWOT';
  if (/^indikator kinerja utama|^indikator kinerja tambahan|\(iku\)|\(ikt\)/.test(j)) return 'IKU';
  return 'lain';
}

/** Ambil catatan biru yang menempel di akhir instruksi: "… baru. (Data dan analisis disampaikan …)". */
function pisahCatatanAkhir(teks: string): { instruksi: string; catatan: string | null } {
  const m = /\s*(\((?:penjelasan|data dan analisis|diisi)[^()]*disampaikan oleh pengusul[^()]*\)?\.?)\s*$/i.exec(teks)
    ?? /\s*(\((?:penjelasan|data dan analisis|diisi)[^()]*oleh pengusul[^()]*\)?\.?)\s*$/i.exec(teks);
  if (!m || m.index === 0) return { instruksi: teks, catatan: null };
  return { instruksi: rapi(teks.slice(0, m.index)), catatan: rapi(m[1]) };
}

interface Blok {
  instruksi: string[];
  catatan: string[];
}

interface Judul {
  teks: string;
  dalam: number;
}

export function uraiTemplate(paragraf: ParagrafTemplate[]): BagianHasilTemplate[] {
  const bagian: BagianHasilTemplate[] = [];
  let kini: BagianHasilTemplate | null = null;
  let nomorKriteria = 0;
  let dalamBab2 = false;
  let tumpuk: Judul[] = [];
  const geser = new Map<string, number>();
  let blok: Blok | null = null;
  // blok yang sudah selesai di bawah judul yang sama (untuk menggabung varian)
  let blokJudul: { jalur: string[]; judul: string; blok: Blok[] } | null = null;

  const judulKini = () => tumpuk[tumpuk.length - 1]?.teks ?? kini?.nama ?? '';

  const simpanKelompok = () => {
    if (!blokJudul || !kini) return;
    const grup = blokJudul;
    blokJudul = null;
    const isi = grup.blok.map((b) => {
      const catatan = b.catatan.join(' ');
      const ada = rapi(b.instruksi.join('\n').replace(/[ \t]+/g, ' '));
      return { instruksi: ada || grup.judul, dariJudul: !ada, catatan: catatan || null, jenjang: catatan ? jenjangCatatan(catatan) : null };
    });
    // blok tanpa catatan di samping blok bercatatan: jenjang = sisanya
    const tercatat = new Set(isi.flatMap((x) => x.jenjang ?? []));
    const sisa = SEMUA.filter((j) => !tercatat.has(j));
    const lengkap = isi.map((x) => ({ ...x, jenjang: x.jenjang ?? (tercatat.size && sisa.length ? sisa : [...SEMUA]) }));
    // varian bila jenjang saling lepas; selain itu sub-bagian terpisah
    const subBaru: VarianTemplate[][] = [];
    for (const x of lengkap) {
      const v: VarianTemplate = { instruksi: x.instruksi, jenjang: x.jenjang, catatanTemplate: x.catatan, ...(x.dariJudul ? { dariJudul: true } : {}) };
      const akhir = subBaru[subBaru.length - 1];
      if (akhir && akhir.every((y) => !y.jenjang.some((j) => v.jenjang.includes(j)))) akhir.push(v);
      else subBaru.push([v]);
    }
    const peran = peranDariJudul(grup.judul);
    for (const [i, varian] of subBaru.entries()) {
      kini.sub.push({
        jalur: grup.jalur,
        judul: subBaru.length > 1 ? `${grup.judul} (${['I', 'II', 'III', 'IV', 'V', 'VI'][i] ?? i + 1})` : grup.judul,
        peran: peran === 'lain' && grup.jalur.some((x) => peranDariJudul(x) === 'IKU') ? 'IKU' : peran,
        varian,
      });
    }
  };

  const tutupBlok = () => {
    if (!blok) return;
    if (blok.instruksi.length || blok.catatan.length) {
      const jalur = tumpuk.slice(0, -1).map((j) => j.teks);
      const judul = judulKini();
      if (!blokJudul || blokJudul.judul !== judul || blokJudul.jalur.join('|') !== jalur.join('|')) {
        simpanKelompok();
        blokJudul = { jalur, judul, blok: [] };
      }
      blokJudul.blok.push(blok);
    }
    blok = null;
  };

  const bukaBagian = (kode: string, nama: string, jenis: BagianHasilTemplate['jenis']) => {
    tutupBlok();
    simpanKelompok();
    kini = { kode, nama: rapi(nama), jenis, pengantar: null, sub: [] };
    bagian.push(kini);
    tumpuk = [];
    geser.clear();
  };

  for (const p of paragraf) {
    const teks = rapi(p.teks);
    if (p.tabel || /^toc/i.test(p.gaya)) continue;
    const gaya = p.gaya.toLowerCase();

    // ---- judul besar
    const bab = /^BAB\s+([IVX]+)\.?\s*(.*)$/i.exec(teks);
    if (bab && (/judul besar|heading 1|title/.test(gaya) || teks === teks.toUpperCase())) {
      const r = bab[1].toUpperCase();
      dalamBab2 = r === 'II';
      if (r !== 'II') bukaBagian(r, teks, r === 'III' ? 'butir' : 'bab');
      else { tutupBlok(); simpanKelompok(); kini = null; }
      continue;
    }
    if (/^LAMPIRAN$/i.test(teks) && /judul besar|heading 1/.test(gaya)) {
      dalamBab2 = false;
      bukaBagian('LAMPIRAN', 'LAMPIRAN', 'bab');
      continue;
    }
    if (/judul besar/.test(gaya)) {
      // KATA PENGANTAR, DAFTAR ISI, dsb.: bagian awal, diatur sistem
      tutupBlok();
      simpanKelompok();
      kini = null;
      continue;
    }
    if (dalamBab2 && /sub judul/.test(gaya) && teks) {
      if (/kriteria akreditasi/i.test(teks)) { tutupBlok(); simpanKelompok(); kini = null; continue; }
      const huruf = bagian.filter((b) => /^II\./.test(b.kode)).length;
      bukaBagian(`II.${String.fromCharCode(65 + huruf)}`, teks, huruf === 1 ? 'butir' : 'bab');
      continue;
    }
    if (/^c\.\d+\./.test(gaya) && teks && !p.numId) {
      nomorKriteria += 1;
      bukaBagian(`C.${nomorKriteria}`, teks, 'kriteria');
      continue;
    }
    if (!kini) continue;

    // ---- isi bagian
    // catatan biru bisa berdiri sendiri atau menempel di akhir instruksi
    const pisah = pisahCatatanAkhir(teks);
    const catatan = CATATAN.test(teks) && (pisah.catatan === null || !pisah.instruksi || /^[(/]/.test(pisah.instruksi));
    const instruksi = INSTRUKSI.test(teks);
    // paragraf bernomor berisi judul dan instruksi sekaligus: "Analisis Faktor ... Berisi deskripsi ..."
    const gabung = p.numId && !instruksi ? /^(.{5,160}?)\s+((?:Berisi|Bagian ini)\b.*)$/.exec(teks) : null;
    const judulRomawi = !p.numId && /^[IVX]{1,4}\.\s+\S/.test(teks) && teks.length <= 120 && !instruksi;
    const judulBernomor = Boolean(p.numId) && !instruksi && !catatan && teks.length > 0 && (teks.length <= 220 || Boolean(gabung))
      && !/^\(\d+\)/.test(teks);
    if (judulBernomor || judulRomawi) {
      tutupBlok();
      let dalam: number;
      if (judulRomawi) {
        const romawiSebelum = [...tumpuk].reverse().find((j) => /^[IVX]{1,4}\.\s/.test(j.teks));
        dalam = romawiSebelum ? romawiSebelum.dalam : (tumpuk[tumpuk.length - 1]?.dalam ?? -1) + 1;
      } else {
        const kunci = p.numId!;
        if (!geser.has(kunci)) {
          const atas = tumpuk[tumpuk.length - 1]?.dalam ?? -1;
          geser.set(kunci, Math.max(0, atas + 1 - p.ilvl));
        }
        dalam = p.ilvl + geser.get(kunci)!;
        const atas = tumpuk[tumpuk.length - 1]?.dalam ?? -1;
        if (dalam > atas + 1) dalam = atas + 1;
      }
      while (tumpuk.length && tumpuk[tumpuk.length - 1].dalam >= dalam) tumpuk.pop();
      const judul = gabung ? gabung[1] : teks;
      tumpuk.push({ teks: bersihJudul(judul.replace(/^[ivx]{1,4}\.\s+/, '')), dalam });
      if (gabung) {
        const { instruksi: ins, catatan: cat } = pisahCatatanAkhir(gabung[2]);
        blok = { instruksi: [ins], catatan: cat ? [cat] : [] };
      }
      if (p.kotak) { blok ??= { instruksi: [], catatan: [] }; tutupBlok(); }
      continue;
    }
    if (!teks && !p.kotak) continue;
    blok ??= { instruksi: [], catatan: [] };
    if (catatan) blok.catatan.push(teks);
    else if (teks) {
      const { instruksi: ins, catatan: cat } = pisahCatatanAkhir(teks);
      blok.instruksi.push(ins);
      if (cat) blok.catatan.push(cat);
    }
    if (p.kotak) tutupBlok();
  }
  tutupBlok();
  simpanKelompok();
  for (const b of bagian) {
    // blok sebelum judul pertama di bagian yang punya judul = pengantar bagian, bukan sub-bagian
    const tanpaJudul = b.sub.filter((x) => x.jalur.length === 0 && x.judul === b.nama);
    if (tanpaJudul.length && tanpaJudul.length < b.sub.length) {
      b.pengantar = tanpaJudul.flatMap((x) => x.varian.map((v) => v.instruksi)).join('\n');
      b.sub = b.sub.filter((x) => !tanpaJudul.includes(x));
    }
  }
  return bagian.filter((b) => b.sub.length > 0);
}

/** Sub-bagian yang berlaku untuk satu jenjang (varian lain dibuang). */
export function untukJenjang(bagian: BagianHasilTemplate[], jenjang: string): BagianHasilTemplate[] {
  return bagian.map((b) => ({
    ...b,
    sub: b.sub
      .map((s) => ({ ...s, varian: s.varian.filter((v) => v.jenjang.includes(jenjang)) }))
      .filter((s) => s.varian.length > 0),
  }));
}

// ------------------------------------------------------------------ pemetaan ke kode sub-bagian

export interface SubRujukan {
  bagianKode: string;
  /** jenjang yang ditetapkan manual di versi rujukan (menimpa catatan template) */
  jenjangOverride?: string[];
  kode: string;
  label: string;
  judul: string;
  grup: string | null;
  tipe: string;
  instruksi: string[];
}

export interface SubTerpetakan {
  bagianKode: string;
  kode: string;
  label: string;
  judul: string;
  grup: string | null;
  tipe: string;
  varian: VarianTemplate[];
  /** jenjang yang ditetapkan manual di versi rujukan (menimpa catatan template) */
  jenjangOverride: string[];
  /** null = sub-bagian baru (tidak ada padanan di versi rujukan) */
  dariRujukan: string | null;
}

export function kunciTeks(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Panjang awalan bersama dua instruksi (setelah dinormalkan). */
function awalanSama(a: string, b: string): number {
  const x = kunciTeks(a);
  const y = kunciTeks(b);
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i;
}

/**
 * Skor kemiripan instruksi: panjang awalan bersama bila cukup panjang (minimal 60 karakter, atau seluruh instruksi
 * yang lebih pendek); 0 bila tidak mirip. Banyak instruksi berawalan sama ("Bagian ini menjelaskan data dan analisis
 * terkait ..."), jadi kandidat dengan awalan bersama terpanjang yang dipilih.
 */
const AWALAN_BAKU = /^(pada )?(bagian ini )?(berisi(kan)? )?(memuat |menjelaskan |mendeskripsikan |mencakup |mengidentifikasi )?(bahwa )?(deskripsi )?(data dan analisis terkait |data |jumlah |rerata )?/;

function inti(s: string): string {
  return kunciTeks(s).replace(AWALAN_BAKU, '');
}

function skorInstruksi(a: string, b: string): number {
  const x = inti(a);
  const y = inti(b);
  const pendek = Math.min(x.length, y.length);
  if (pendek < 10) return 0;
  const n = awalanSama(x, y);
  return n >= Math.min(30, pendek) ? n : 0;
}

function miripInstruksi(a: string, b: string): boolean {
  return skorInstruksi(a, b) > 0;
}

/**
 * Beri kode sub-bagian: pakai kode, label, grup, dan judul versi rujukan bila instruksinya cocok (kode tetap
 * stabil antarversi sehingga rumus, ekspor, dan draf lama tetap terpetakan); LB/KEB/AF/SWOT memakai kode baku;
 * sisanya mendapat kode baru berurutan.
 */
export function petakanSubBagian(
  bagian: BagianHasilTemplate[],
  rujukan: SubRujukan[],
  opsi: { jenjang?: string; semuaVarian?: BagianHasilTemplate[] } = {},
): { bagian: BagianHasilTemplate; sub: SubTerpetakan[] }[] {
  const terpakai = new Set<string>();
  return bagian.map((b) => {
    let nomorBaru = 0;
    const sub = b.sub.map((s): SubTerpetakan => {
      const kandidat = rujukan.filter((r) => r.bagianKode === b.kode && !terpakai.has(r.kode));
      const sebagian = rujukan.filter((r) => r.bagianKode === b.kode);
      const terbaik = kandidat
        .map((r) => ({ r, skor: Math.max(0, ...r.instruksi.flatMap((i) => s.varian.map((v) => skorInstruksi(i, v.instruksi)))) }))
        .filter((x) => x.skor > 0)
        .sort((x, y) => y.skor - x.skor)[0]?.r;
      const cocok = terbaik
        ?? kandidat.find((r) => kunciTeks(r.judul) === kunciTeks(s.judul))
        // bab dengan satu sub-bagian (Bab I, Bab IV, Lampiran)
        ?? (b.sub.length === 1 && sebagian.length === 1 ? kandidat[0] : undefined);
      if (cocok) {
        terpakai.add(cocok.kode);
        // template tanpa instruksi (hanya judul/catatan): pakai instruksi versi rujukan
        const varian = s.varian.map((v) => (v.dariJudul && cocok.instruksi[0] ? { ...v, instruksi: cocok.instruksi[0], dariJudul: undefined } : v));
        return {
          bagianKode: b.kode, kode: cocok.kode, label: cocok.label, judul: cocok.judul, grup: cocok.grup,
          tipe: cocok.tipe,
          varian, jenjangOverride: cocok.jenjangOverride ?? [], dariRujukan: cocok.kode,
        };
      }
      const baku = b.jenis === 'kriteria' && ['LB', 'KEB', 'AF', 'SWOT'].includes(s.peran) ? s.peran : null;
      const kode = baku ? `${b.kode}-${baku}` : b.jenis === 'kriteria' ? `${b.kode}-IKU-baru${String(++nomorBaru).padStart(2, '0')}` : `${b.kode}-${++nomorBaru}`;
      terpakai.add(kode);
      return {
        bagianKode: b.kode,
        kode,
        label: baku ? ({ LB: '1', KEB: '2', AF: '4', SWOT: '5' } as Record<string, string>)[baku] : '',
        judul: s.judul,
        grup: s.jalur.filter((j) => peranDariJudul(j) !== 'IKU').join(' › ') || null,
        tipe: baku ? 'bersama' : b.jenis === 'kriteria' || s.peran === 'IKU' ? 'iku' : 'narasi',
        varian: s.varian,
        jenjangOverride: [],
        dariRujukan: null,
      };
    });
    // sub-bagian rujukan yang jenjangnya ditetapkan manual (mis. template menandai khusus PPI tetapi matriks
    // jenjang ini tetap menilainya) ikut dibawa memakai instruksi template jenjang mana pun
    if (opsi.jenjang) {
      const urutRujukan = rujukan.filter((r) => r.bagianKode === b.kode);
      for (const r of urutRujukan) {
        if (terpakai.has(r.kode) || !r.jenjangOverride?.includes(opsi.jenjang)) continue;
        const sumber = opsi.semuaVarian?.find((x) => x.kode === b.kode)?.sub
          .find((x) => x.varian.some((v) => r.instruksi.some((i) => miripInstruksi(i, v.instruksi))));
        const varian = sumber?.varian.map((v) => ({ ...v, jenjang: [opsi.jenjang!] })).slice(0, 1)
          ?? r.instruksi.slice(0, 1).map((i) => ({ instruksi: i, jenjang: [opsi.jenjang!], catatanTemplate: null }));
        if (!varian.length) continue;
        terpakai.add(r.kode);
        const posisi = urutRujukan.indexOf(r);
        const setelah = sub.findLastIndex((x) => x.dariRujukan && urutRujukan.findIndex((y) => y.kode === x.dariRujukan) < posisi);
        sub.splice(setelah + 1, 0, {
          bagianKode: b.kode, kode: r.kode, label: r.label, judul: r.judul, grup: r.grup,
          tipe: r.tipe, varian, jenjangOverride: r.jenjangOverride ?? [], dariRujukan: r.kode,
        });
      }
    }
    return { bagian: b, sub };
  });
}
