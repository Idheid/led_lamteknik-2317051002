import { LABEL_PERAN, daftarGaya } from './pemetaan-template.ts';
import { PERAN_GAYA, type ParagrafTemplate, type PeranGaya } from './template-led.ts';

/**
 * Usulan struktur template dari AI (perbaikan 2 Nov 2026, I4), hanya bila Admin memintanya. Yang dikirim hanya
 * KERANGKA: untuk tiap paragraf judul atau calon judul, nama gaya, bernomor atau tidak, tingkat (ilvl), dan 120
 * karakter pertama teksnya, ditambah daftar kriteria Matriks bila sudah diunggah. Isi narasi tidak dikirim; template
 * tidak berisi data pribadi. Hasil AI hanya mengisi usulan di halaman Pemetaan, tidak pernah disimpan sendiri.
 */

export interface BarisKerangka {
  gaya: string;
  bernomor: boolean;
  ilvl: number;
  teks: string;
}

export const PANJANG_TEKS_KERANGKA = 120;

function rapi(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const POLA_NOMOR = /^([IVX]{1,4}\.|[A-Z]\.|\d+(\.\d+)*\.?)\s/;

/** Paragraf judul atau calon judul: pendek, dan bernomor, bergaya judul, huruf kapital, atau diawali nomor. */
export function calonJudul(p: ParagrafTemplate): boolean {
  const t = rapi(p.teks);
  if (p.tabel || /^toc/i.test(p.gaya) || t.length === 0 || t.length > 160) return false;
  if (/^(bagian ini|berisi)\b/i.test(t)) return false;
  return Boolean(p.numId) || /heading|judul|title|^c\.\d|sub/i.test(p.gaya) || (t === t.toUpperCase() && /[A-Z]/.test(t)) || POLA_NOMOR.test(t);
}

export function kerangkaTemplate(paragraf: ParagrafTemplate[]): BarisKerangka[] {
  return paragraf.filter(calonJudul).map((p) => ({
    gaya: p.gaya || '(tanpa gaya)',
    bernomor: Boolean(p.numId),
    ilvl: p.ilvl,
    teks: rapi(p.teks).slice(0, PANJANG_TEKS_KERANGKA),
  }));
}

/** Perkiraan token kasar: sekitar 4 karakter per token untuk teks Indonesia, ditambah keluaran JSON per gaya. */
export function perkiraanToken(sistem: string, pengguna: string, jumlahGaya: number): number {
  return Math.ceil((sistem.length + pengguna.length) / 4) + jumlahGaya * 40 + 200;
}

export function promptStruktur(paragraf: ParagrafTemplate[], kriteriaMatriks: string[]): { sistem: string; pengguna: string; jumlahJudul: number; gaya: string[] } {
  const kerangka = kerangkaTemplate(paragraf);
  const gaya = daftarGaya(paragraf).map((g) => g.gaya || '(tanpa gaya)');
  const sistem = [
    'Anda membantu membaca struktur Template Laporan Evaluasi Diri (LED) akreditasi program studi LAM Teknik dalam format Word.',
    'Tugas: tentukan PERAN setiap gaya paragraf. Peran yang boleh dipakai:',
    ...PERAN_GAYA.map((p) => `- ${p}: ${LABEL_PERAN[p]}`),
    '- biasa: dibaca seperti biasa (paragraf bernomor menjadi judul sub-bagian, "Bagian ini ..." menjadi instruksi).',
    'Struktur LED: BAB I, BAB II (bagian II.A, II.B, lalu "Kriteria Akreditasi" berisi kriteria C.1, C.2, ...), BAB III, BAB IV, LAMPIRAN.',
    'Setiap kriteria berisi judul sub-bagian (Latar Belakang, Kebijakan, Indikator Kinerja Utama, ...) dan instruksi pengisian.',
    'Jumlah gaya berperan "kriteria" harus menghasilkan jumlah kriteria yang sama dengan Matriks Penilaian bila daftarnya diberikan.',
    'Gunakan "biasa" bila ragu. Beri alasan singkat (maksimal 15 kata) untuk setiap gaya.',
  ].join('\n');
  const pengguna = [
    `## GAYA PARAGRAF\n${gaya.join('\n')}`,
    kriteriaMatriks.length ? `## KRITERIA DI MATRIKS PENILAIAN (${kriteriaMatriks.length})\n${kriteriaMatriks.map((k, i) => `${i + 1}. ${k}`).join('\n')}` : null,
    `## KERANGKA JUDUL (gaya | bernomor | tingkat | teks)\n${kerangka.map((k) => `${k.gaya} | ${k.bernomor ? 'ya' : 'tidak'} | ${k.ilvl} | ${k.teks}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');
  return { sistem, pengguna, jumlahJudul: kerangka.length, gaya };
}

export interface KeluaranStruktur {
  peran: { gaya: string; peran: PeranGaya | 'biasa'; alasan: string }[];
  polaCatatan?: string | null;
}

export interface UsulanAi {
  gaya: Record<string, PeranGaya>;
  /** gaya yang diberi peran oleh AI (termasuk "biasa"), dengan alasannya */
  alasan: Record<string, string>;
}

/** Keluaran AI → usulan pemetaan; gaya yang tidak ada di template diabaikan. */
export function gabungUsulanAi(keluaran: KeluaranStruktur, gayaTemplate: string[]): UsulanAi {
  const dikenal = new Set(gayaTemplate);
  const gaya: Record<string, PeranGaya> = {};
  const alasan: Record<string, string> = {};
  for (const x of keluaran.peran) {
    const nama = x.gaya === '(tanpa gaya)' ? '' : x.gaya;
    if (!dikenal.has(nama) && !dikenal.has(x.gaya)) continue;
    alasan[nama] = rapi(x.alasan).slice(0, 200);
    if (x.peran !== 'biasa') gaya[nama] = x.peran;
  }
  return { gaya, alasan };
}
