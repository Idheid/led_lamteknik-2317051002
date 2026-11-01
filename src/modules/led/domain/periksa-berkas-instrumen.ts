import { JENJANG, namaJenjang } from '../../bersama/domain/jenjang.ts';
import { kunciTeks, type ParagrafTemplate } from './template-led.ts';

/**
 * Pemeriksaan berkas instrumen saat diunggah (perbaikan 2 Nov 2026, I1). Semua keputusan diambil dari ISI berkas;
 * metadata (tanggal dibuat/diubah, nama berkas) tidak dipakai karena mudah berubah. Tiga lapis:
 * 1. tahun dan jenjang dibaca dari teks Matriks/Pedoman (PDF) dan harus sama dengan isian versi;
 * 2. kriteria Template LED harus sama dengan kriteria Matriks tahun itu (template tidak memuat tahun);
 * 3. sidik jari SHA-256 berkas yang dikenal (resmi/usang) dan struktur kriteria yang dikenal, untuk pesan yang tepat.
 * Tahun baru yang cocok (isian = teks matriks, kriteria template = kriteria matriks) tidak pernah ditolak.
 */

export type JenisBerkas = 'template' | 'matriks' | 'pedoman';

export type JenisTerdeteksi =
  | JenisBerkas
  | 'peringatan'
  | 'lkps'
  | 'pedoman-penyusunan'
  | 'naskah-akademik'
  | 'bukan-pdf'
  | 'rusak'
  | 'tidak-dikenal';

export const LABEL_JENIS: Record<JenisTerdeteksi, string> = {
  template: 'Template LED',
  matriks: 'Matriks Penilaian',
  pedoman: 'Pedoman Penilaian',
  peringatan: 'Peringatan Pengisian',
  lkps: 'Template LKPS',
  'pedoman-penyusunan': 'Pedoman/Panduan Penyusunan',
  'naskah-akademik': 'Naskah Akademik',
  'bukan-pdf': 'bukan berkas PDF',
  rusak: 'berkas rusak atau bukan dokumen Word',
  'tidak-dikenal': 'dokumen lain',
};

/** Skema instrumen versi yang dibuat aplikasi ini (LED reguler). */
export const SKEMA_VERSI = 'reguler';

export const LABEL_SKEMA: Record<string, string> = {
  reguler: 'reguler',
  'unggul-internasional': 'Unggul Internasional',
  pjj: 'Pendidikan Jarak Jauh (PJJ)',
  lama: 'struktur LED lama',
};

export interface BerkasDikenal {
  nama: string;
  /** null = struktur lama tanpa tahun */
  tahun: number | null;
  skema: string;
  sumber: string;
  status: 'resmi' | 'usang';
}

export interface StrukturDikenal {
  tahun: number | null;
  skema: string;
  kriteria: string[];
}

export interface SidikJariDikenal {
  berkas: Record<string, BerkasDikenal>;
  struktur: StrukturDikenal[];
}

/** Hasil membaca isi satu berkas (tanpa AI). */
export interface BacaanBerkas {
  jenis: JenisTerdeteksi;
  sha256: string;
  /** beberapa teks awal untuk pesan "terbaca: ..." */
  judulAwal: string;
  tahun: number | null;
  jenjang: string | null;
  /** kriteria template (aturan bawaan/pemetaan) atau kriteria matriks (kolom Kriteria) */
  kriteria: string[] | null;
  /** teks matriks yang dinormalkan, untuk mencari nama kriteria template */
  teksKunci?: string;
}

export type Konfirmasi = 'tahun' | 'skema';

export interface HasilPeriksa {
  diterima: boolean;
  jenisBerkas: JenisBerkas;
  namaBerkas: string;
  waktu: string;
  /** judul kotak, mis. "Berkas ditolak: tahun tidak sesuai" */
  judul: string;
  alasan: string;
  langkah: string;
  /** apa yang terbaca dari isi berkas */
  terbaca: { label: string; nilai: string }[];
  info: string[];
  /** centang yang wajib diberikan Admin sebelum ekstraksi */
  konfirmasi: { jenis: Konfirmasi; teks: string }[];
  /** ringkasan bacaan (disimpan di sidik jari versi) */
  bacaan: Omit<BacaanBerkas, 'teksKunci'>;
}

// ------------------------------------------------------------------ tahun instrumen

export const TAHUN_INSTRUMEN_MIN = 2020;

export function tahunInstrumenSah(tahun: number, tahunBerjalan: number): boolean {
  return Number.isInteger(tahun) && tahun >= TAHUN_INSTRUMEN_MIN && tahun <= tahunBerjalan + 2;
}

/** "Sudah ada instrumen aktif tahun {aktif} untuk {jenjang}; tahun {y} lebih lama." */
export function periksaTahunAktif(tahun: number, aktif: number | null, jenjang: string | null): string | null {
  if (aktif === null || !jenjang || tahun >= aktif) return null;
  return `Sudah ada instrumen aktif tahun ${aktif} untuk ${namaJenjang(jenjang)}; tahun ${tahun} lebih lama.`;
}

// ------------------------------------------------------------------ jenis berkas dari isi

function rapi(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Jenis dokumen Word dari paragraf-paragraf awalnya. */
export function jenisDocx(teksAwal: string[]): JenisTerdeteksi {
  const t = rapi(teksAwal.join(' '));
  if (/peringatan pengisian/i.test(t)) return 'peringatan';
  if (/laporan evaluasi diri/i.test(t)) return 'template';
  if (/laporan kinerja program studi|\bLKPS\b/i.test(t)) return 'lkps';
  return 'tidak-dikenal';
}

/** Jenis dokumen PDF dari teks halaman-halaman awalnya. */
export function jenisPdf(teks: string): JenisTerdeteksi {
  const t = rapi(teks);
  if (/MATRIKS?\s+PENILAIAN/i.test(t) && /\bNo\.?\s+Kriteria\s+Indikator\s+4\s+3\s+2\s+1\s+0\b/i.test(t)) return 'matriks';
  if (/PEDOMAN\s+PENILAIAN/i.test(t)) return 'pedoman';
  if (/(PEDOMAN|PANDUAN)\s+PENYUSUNAN/i.test(t)) return 'pedoman-penyusunan';
  if (/NASKAH\s+AKADEMIK/i.test(t)) return 'naskah-akademik';
  return 'tidak-dikenal';
}

// ------------------------------------------------------------------ lapis 1: tahun dan jenjang dari teks

const POLA_TAHUN: RegExp[] = [
  /\bI?APS-[A-Z]+\s+(\d{4})\b/g,
  /Instrumen\s+(?:Akreditasi\s+)?LAM\s+Teknik\s+(\d{4})\b/gi,
  /Peraturan\s+LAM\s+Teknik\s+Nomor\s+\d+\s+Tahun\s+(\d{4})\b/gi,
  /(?:MATRIKS?|PEDOMAN)\s+PENILAIAN[^.]{0,160}?\b(20\d{2})\b/gi,
];

/** Tahun instrumen dari teks: pola yang lebih kuat didahulukan; dalam satu pola, tahun yang paling sering. */
export function tahunDariTeks(teks: string): number | null {
  const t = rapi(teks);
  for (const pola of POLA_TAHUN) {
    const hitung = new Map<number, number>();
    for (const m of t.matchAll(pola)) {
      const n = Number(m[1]);
      if (n >= 2000 && n <= 2100) hitung.set(n, (hitung.get(n) ?? 0) + 1);
    }
    if (hitung.size) return [...hitung].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  }
  return null;
}

const kunciRapat = (s: string) => kunciTeks(s).replace(/\s+/g, '');

/** Nama jenjang tanpa awalan "Program", dirapatkan; yang terpanjang dicoba dulu (Sarjana Terapan sebelum Sarjana). */
const JENJANG_RAPAT = JENJANG.map((j) => ({ kode: j.kode, kunci: kunciRapat(j.nama).replace(/^program/, '') }))
  .sort((a, b) => b.kunci.length - a.kunci.length);

function jenjangDariFrasa(frasa: string): string | null {
  const k = kunciRapat(frasa).replace(/^program(studi)?/, '');
  return JENJANG_RAPAT.find((j) => k.startsWith(j.kunci))?.kode ?? null;
}

/**
 * Jenjang dari judul halaman Matriks: "… PROGRAM STUDI - PROGRAM DIPLOMA TIGA IAPS-AV 2025 1.0". Sampul resmi kadang
 * salah tulis jenjang ("PROGRAM DIPLOMA SATU" di matriks Sarjana), jadi judul halaman dan kaki halaman yang dipakai.
 */
export function jenjangDariMatriks(teks: string): string | null {
  const t = rapi(teks);
  const hitung = new Map<string, number>();
  for (const m of t.matchAll(/\s-\s+((?:PROGRAM\s+)?[A-Z][A-Z ]{3,80}?)\s+I?APS-[A-Z]+/g)) {
    const j = jenjangDariFrasa(m[1]);
    if (j) hitung.set(j, (hitung.get(j) ?? 0) + 1);
  }
  if (!hitung.size) {
    for (const m of t.matchAll(/LAM Teknik\s+(?:\d+\s+)?(Program\s+[A-Za-z ]{4,40})/g)) {
      const j = jenjangDariFrasa(m[1]);
      if (j) hitung.set(j, (hitung.get(j) ?? 0) + 1);
    }
  }
  return hitung.size ? [...hitung].sort((a, b) => b[1] - a[1])[0][0] : null;
}

// ------------------------------------------------------------------ lapis 2: kriteria

/** Kriteria matriks dari konteks baris (judul "I. Diferensiasi Misi …" di bawah "A. KRITERIA"). */
export function kriteriaDariKonteks(konteks: string[][]): string[] {
  const hasil: string[] = [];
  for (const k of konteks) {
    const i = k.findIndex((x) => /^[A-Z]\.\s+KRITERIA$/i.test(rapi(x)));
    const judul = i >= 0 ? k[i + 1] : undefined;
    if (!judul) continue;
    const nama = rapi(judul).replace(/^[IVX]+\.\s+/, '');
    if (!hasil.some((x) => kunciRapat(x) === kunciRapat(nama))) hasil.push(nama);
  }
  return hasil;
}

const INSTRUKSI = /^(bagian ini|berisi|pada bagian ini|\(|catatan)/i;

/**
 * Kriteria template yang tidak terbaca aturan bawaan (mis. template LPMPP 2022 bergaya "heading 3"): judul pertama
 * sesudah "Kriteria Akreditasi" menentukan gaya dan tingkat kriteria; semua judul bergaya dan bertingkat sama
 * sesudahnya diambil sampai muncul judul yang lebih dangkal atau BAB berikutnya.
 */
export function kriteriaTemplateCadangan(paragraf: ParagrafTemplate[]): string[] {
  const awal = paragraf.findIndex((p) => /^kriteria akreditasi\.?$/i.test(rapi(p.teks)));
  if (awal < 0) return [];
  const judul = (p: ParagrafTemplate) => {
    const t = rapi(p.teks);
    return t.length > 0 && t.length <= 150 && !INSTRUKSI.test(t) && !p.tabel && (Boolean(p.numId) || /heading|judul/i.test(p.gaya));
  };
  const pertama = paragraf.slice(awal + 1).find(judul);
  if (!pertama) return [];
  const hasil: string[] = [];
  for (const p of paragraf.slice(paragraf.indexOf(pertama))) {
    const t = rapi(p.teks);
    if (/^BAB\s+[IVX]+\b/i.test(t) && judul(p)) break;
    if (!judul(p)) continue;
    if (p.gaya === pertama.gaya && p.ilvl === pertama.ilvl) hasil.push(t.replace(/^(C\.\d+\.?\s*|[IVX]+\.\s+|\d+\.\s+)/, '').replace(/[.:]\s*$/, ''));
    else if (p.gaya === pertama.gaya && p.ilvl < pertama.ilvl) break;
    else if (/heading [12]$/i.test(p.gaya) && !/heading [12]$/i.test(pertama.gaya)) break;
  }
  return hasil;
}

/** Kunci pembanding nama kriteria: abaikan huruf besar, tanda baca, spasi; "Pengabdian kepada Masyarakat" = "PkM". */
export function kunciKriteria(s: string): string {
  return kunciTeks(s).replace(/pengabdian kepada masyarakat/g, 'pkm').replace(/\s+/g, '');
}

export interface CocokKriteria {
  cocok: boolean;
  /** kriteria template yang tidak ada di matriks */
  hilang: string[];
  /** kriteria matriks yang tidak ada di template */
  lebih: string[];
}

/**
 * Cocok bila jumlah kriteria sama dan setiap kriteria template ada di matriks. Nama dicari di kolom Kriteria hasil
 * baca, lalu di seluruh teks matriks (baris judul kriteria kadang tidak terbaca sebagai konteks).
 */
export function cocokKriteria(template: string[], matriks: { kriteria: string[]; teksKunci?: string }): CocokKriteria {
  const teks = matriks.teksKunci ?? '';
  const ada = (t: string) => matriks.kriteria.some((m) => kunciKriteria(m) === kunciKriteria(t)) || (teks.length > 0 && teks.includes(kunciKriteria(t)));
  const hilang = template.filter((t) => !ada(t));
  const lebih = matriks.kriteria.filter((m) => !template.some((t) => kunciKriteria(t) === kunciKriteria(m)));
  return { cocok: template.length > 0 && hilang.length === 0 && lebih.length === 0, hilang, lebih };
}

/** Teks matriks untuk pencarian nama kriteria (dengan kunci yang sama). */
export function teksKunciMatriks(teks: string): string {
  return kunciKriteria(teks);
}

export function strukturCocok(kriteria: string[], dikenal: StrukturDikenal[]): StrukturDikenal | null {
  if (!kriteria.length) return null;
  const k = kriteria.map(kunciKriteria).sort().join('|');
  return dikenal.find((s) => s.kriteria.map(kunciKriteria).sort().join('|') === k) ?? null;
}

// ------------------------------------------------------------------ keputusan

export interface MasukanPeriksa {
  jenis: JenisBerkas;
  namaBerkas: string;
  tahunIsian: number;
  /** null = versi lama lintas jenjang (pemeriksaan jenjang dilewati) */
  jenjangVersi: string | null;
  /** tahun versi aktif jenjang yang sama (selain versi ini) */
  tahunAktif: number | null;
  bacaan: BacaanBerkas;
  /** berkas pasangan yang sudah terunggah: template untuk matriks, matriks untuk template */
  pasangan?: BacaanBerkas | null;
  dikenal: SidikJariDikenal;
  waktu?: Date;
}

function daftar(xs: string[]): string {
  return xs.length ? xs.join('; ') : '(tidak ada)';
}

/** Pemeriksaan satu berkas yang diunggah. Berkas yang ditolak tidak disimpan. */
export function periksaBerkasInstrumen(m: MasukanPeriksa): HasilPeriksa {
  const { bacaan: b, jenis, tahunIsian: y } = m;
  const label = LABEL_JENIS[jenis];
  const terbaca: HasilPeriksa['terbaca'] = [{ label: 'Jenis terdeteksi', nilai: LABEL_JENIS[b.jenis] }];
  if (b.judulAwal) terbaca.push({ label: 'Teks awal', nilai: b.judulAwal });
  if (jenis !== 'template') terbaca.push({ label: 'Tahun di teks', nilai: b.tahun ? String(b.tahun) : 'tidak ditemukan' });
  if (jenis === 'matriks') terbaca.push({ label: 'Jenjang di teks', nilai: b.jenjang ? namaJenjang(b.jenjang) : 'tidak ditemukan' });
  if (b.kriteria) terbaca.push({ label: `Kriteria (${b.kriteria.length})`, nilai: daftar(b.kriteria) });
  const kenal = m.dikenal.berkas[b.sha256];
  if (kenal) terbaca.push({ label: 'Berkas dikenali', nilai: `${kenal.nama} (${kenal.status === 'usang' ? 'usang' : 'resmi'})` });
  const info: string[] = [];
  const konfirmasi: HasilPeriksa['konfirmasi'] = [];
  const { teksKunci: _t, ...ringkas } = b;
  const hasil = (diterima: boolean, judul: string, alasan: string, langkah: string): HasilPeriksa => ({
    diterima, jenisBerkas: jenis, namaBerkas: m.namaBerkas, waktu: (m.waktu ?? new Date()).toISOString(),
    judul, alasan, langkah, terbaca, info, konfirmasi, bacaan: ringkas,
  });
  const tolak = (judul: string, alasan: string, langkah: string) => hasil(false, `Berkas ditolak: ${judul}`, alasan, langkah);

  const lebihLama = periksaTahunAktif(y, m.tahunAktif, m.jenjangVersi);
  if (lebihLama) return tolak('tahun lebih lama dari instrumen aktif', lebihLama, 'Periksa isian Tahun instrumen. Instrumen yang lebih lama tidak perlu diunggah lagi.');

  // salah jenis berkas (dari isi)
  if (b.jenis !== jenis) {
    const terdeteksi = b.jenis === 'rusak' || b.jenis === 'bukan-pdf' || b.jenis === 'tidak-dikenal'
      ? `Berkas ini ${LABEL_JENIS[b.jenis]}, bukan ${label}.`
      : `Berkas ini tampaknya ${LABEL_JENIS[b.jenis]}, bukan ${label}.`;
    const langkah = b.jenis === 'rusak'
      ? 'Simpan ulang sebagai .docx lalu unggah lagi.'
      : `Unggah ${label} ${jenis === 'template' ? '(.docx)' : '(.pdf)'} dari LAM Teknik pada baris yang sesuai.`;
    return tolak('jenis berkas salah', terdeteksi, langkah);
  }

  // lapis 3: sidik jari berkas yang dikenal
  if (kenal?.status === 'usang') {
    const alasan = kenal.skema === 'lama'
      ? `Berkas ini ${kenal.nama} (struktur LED lama, ${kenal.sumber}).`
      : `Berkas ini ${kenal.nama}${kenal.tahun && !kenal.nama.includes(String(kenal.tahun)) ? ` (instrumen ${kenal.tahun})` : ''} dan sudah ditandai usang.`;
    return tolak('berkas usang', alasan, `Gunakan ${jenis === 'template' ? 'Template LEDPS' : label} LAM Teknik ${y} dari lamteknik.or.id.`);
  }
  if (kenal && kenal.tahun !== null && kenal.tahun !== y) {
    info.push(`${label} ini sama persis dengan ${kenal.nama}; dipakai untuk instrumen ${y} bila ${jenis === 'template' ? `kriterianya cocok dengan Matriks ${y}` : 'isinya sesuai'}.`);
  } else if (kenal) {
    info.push(`Berkas dikenali: ${kenal.nama}.`);
  }
  if (kenal && kenal.skema !== SKEMA_VERSI) {
    konfirmasi.push({
      jenis: 'skema',
      teks: `${label} ini untuk skema ${LABEL_SKEMA[kenal.skema] ?? kenal.skema}, sedangkan instrumen ini untuk LED ${LABEL_SKEMA[SKEMA_VERSI]}. Saya sudah memastikan berkas ini memang yang dipakai.`,
    });
  }

  // lapis 1: tahun dan jenjang dari teks (matriks dan pedoman)
  if (jenis !== 'template') {
    if (b.tahun !== null && b.tahun !== y) {
      return tolak(
        'tahun tidak sesuai',
        `${label} ini instrumen tahun ${b.tahun}, sedangkan tahun instrumen yang diisi ${y}.`,
        'Periksa berkasnya atau ubah Tahun instrumen di Identitas versi.',
      );
    }
    if (b.tahun === null) {
      konfirmasi.push({ jenis: 'tahun', teks: `Tahun tidak ditemukan di teks ${label}. Saya sudah memastikan berkas ini instrumen tahun ${y}.` });
    }
  }
  if (jenis === 'matriks' && m.jenjangVersi && b.jenjang && b.jenjang !== m.jenjangVersi) {
    return tolak(
      'jenjang tidak sesuai',
      `Matriks ini untuk ${namaJenjang(b.jenjang)}, sedangkan instrumen ini untuk ${namaJenjang(m.jenjangVersi)}.`,
      `Unggah Matriks Penilaian ${namaJenjang(m.jenjangVersi)}, atau buat instrumen baru untuk ${namaJenjang(b.jenjang)}.`,
    );
  }

  // lapis 2: kriteria template = kriteria matriks
  const template = jenis === 'template' ? b : jenis === 'matriks' ? m.pasangan ?? null : null;
  const matriks = jenis === 'matriks' ? b : jenis === 'template' ? m.pasangan ?? null : null;
  if (template?.kriteria?.length && matriks) {
    const c = cocokKriteria(template.kriteria, { kriteria: matriks.kriteria ?? [], teksKunci: matriks.teksKunci });
    if (!c.cocok) {
      const tahunMatriks = matriks.tahun ?? y;
      const lama = strukturCocok(template.kriteria, m.dikenal.struktur);
      const dugaan = lama?.skema === 'lama'
        ? 'Kriteria template sama dengan struktur LED lama (sebelum 2025).'
        : 'Kemungkinan template dari tahun atau skema lain.';
      const rinci = [
        c.hilang.length ? `Tidak ada di Matriks: ${daftar(c.hilang)}.` : '',
        c.lebih.length ? `Hanya ada di Matriks: ${daftar(c.lebih)}.` : '',
      ].filter(Boolean).join(' ');
      return tolak(
        'kriteria template tidak cocok dengan Matriks',
        `Kriteria di Template LED (${daftar(template.kriteria)}) tidak sama dengan kriteria di Matriks ${tahunMatriks} `
          + `(${matriks.kriteria?.length ? daftar(matriks.kriteria) : 'kolom Kriteria tidak terbaca'}). ${dugaan}${rinci ? ` ${rinci}` : ''}`,
        jenis === 'template'
          ? `Unggah Template LEDPS LAM Teknik ${y} yang sepasang dengan Matriks ini.`
          : `Periksa apakah Template LED yang terunggah sepasang dengan Matriks ini; ganti salah satunya.`,
      );
    }
    info.push(`Kriteria Template LED cocok dengan Matriks (${template.kriteria.length} kriteria).`);
  } else if (jenis === 'template' && !b.kriteria?.length) {
    info.push('Kriteria belum terbaca dari template ini; kecocokan dengan Matriks diperiksa setelah judulnya dipetakan.');
  }
  if (jenis === 'template' && b.kriteria?.length && !kenal) {
    const s = strukturCocok(b.kriteria, m.dikenal.struktur);
    info.push(s ? `Struktur kriteria dikenali: instrumen ${s.tahun ?? 'lama'} (${LABEL_SKEMA[s.skema] ?? s.skema}).`
      : 'Struktur kriteria belum dikenal (kemungkinan instrumen baru); keputusan mengikuti kecocokan dengan Matriks.');
  }
  return hasil(true, `${label} diterima`, '', '');
}

/** Konfirmasi yang masih wajib diberikan sebelum ekstraksi. */
export function konfirmasiTertunda(
  perlu: { jenis: Konfirmasi; teks: string; berkas: JenisBerkas }[],
  diberikan: Partial<Record<Konfirmasi, { tahun: number; sha256?: string[] }>>,
  tahun: number,
  sha: Partial<Record<JenisBerkas, string>>,
): { jenis: Konfirmasi; teks: string; berkas: JenisBerkas }[] {
  return perlu.filter((k) => {
    const d = diberikan[k.jenis];
    if (!d || d.tahun !== tahun) return true;
    return Boolean(sha[k.berkas] && !d.sha256?.includes(sha[k.berkas]!));
  });
}

/** Tiga penolakan terakhir, terbaru di depan. */
export function tambahRiwayat(riwayat: HasilPeriksa[], baru: HasilPeriksa, maks = 3): HasilPeriksa[] {
  return [baru, ...riwayat].slice(0, maks);
}
