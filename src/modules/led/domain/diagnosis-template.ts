import { JENJANG, namaJenjang } from '../../bersama/domain/jenjang.ts';
import { jenisDocx, kriteriaTemplateCadangan, kunciKriteria } from './periksa-berkas-instrumen.ts';
import { untukJenjang, type BagianHasilTemplate, type ParagrafTemplate } from './template-led.ts';

/**
 * Diagnosis pembacaan Template LED (perbaikan 2 Nov 2026, I2): ganti galat umum "Tidak ada kriteria … Pastikan
 * berkas adalah Template LEDPS resmi" dengan sebab yang terbaca dari isi berkas dan langkah berikutnya. Diagnosis
 * "format judul tidak dikenali" bukan jalan buntu: Admin bisa memetakan judul sendiri (I3) atau meminta usulan AI (I4).
 */

export type KodeDiagnosis = 'cocok' | 'rusak' | 'bukan-template' | 'struktur-lama' | 'format-lain' | 'jenjang-tidak-ada';

export interface GayaTerbaca {
  gaya: string;
  jumlah: number;
  contoh: string;
}

export interface RingkasanTemplate {
  jumlahParagraf: number;
  bab: string[];
  kriteria: string[];
  /** 10 gaya judul terbanyak beserta contoh teksnya */
  gaya: GayaTerbaca[];
  /** jenjang yang punya sub-bagian di template */
  jenjang: string[];
}

export interface DiagnosisTemplate {
  kode: KodeDiagnosis;
  judul: string;
  pesan: string;
  langkah: string;
  /** true: Admin bisa melanjutkan lewat Pemetaan judul atau usulan AI */
  bisaDipetakan: boolean;
  ringkasan: RingkasanTemplate;
}

/** Kriteria struktur LED lama (sebelum 2025, 9 kriteria): cukup 4 nama yang sama untuk dikenali. */
export const KRITERIA_LAMA = [
  'Visi, Misi, Tujuan, dan Strategi', 'Tata Pamong, Tata Kelola dan Kerja sama', 'Mahasiswa', 'Sumber Daya Manusia',
  'Keuangan, Sarana dan Prasarana', 'Pendidikan', 'Penelitian', 'Pengabdian kepada Masyarakat',
  'Luaran dan Capaian Tridharma Perguruan Tinggi',
];

const GAYA_JUDUL = /heading|judul|title|^c\.\d|kriteria/i;

function rapi(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function potong(s: string, n = 80): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Ringkasan yang terbaca: jumlah paragraf, BAB, kriteria, gaya judul terbanyak. */
export function ringkasTemplate(paragraf: ParagrafTemplate[], hasil: BagianHasilTemplate[], kriteria: string[]): RingkasanTemplate {
  const isi = paragraf.filter((p) => !p.tabel && rapi(p.teks));
  const bab = isi.filter((p) => !/^toc/i.test(p.gaya)).map((p) => rapi(p.teks)).filter((t) => /^BAB\s+[IVX]+\b/i.test(t) && t.length <= 120).map((t) => potong(t, 60));
  const hitung = new Map<string, GayaTerbaca>();
  for (const p of isi) {
    const t = rapi(p.teks);
    if (/^toc/i.test(p.gaya) || t.length > 150) continue;
    if (!GAYA_JUDUL.test(p.gaya) && !p.numId) continue;
    const g = p.gaya || '(tanpa gaya)';
    const x = hitung.get(g) ?? { gaya: g, jumlah: 0, contoh: potong(t) };
    x.jumlah += 1;
    hitung.set(g, x);
  }
  const jenjang = JENJANG.map((j) => j.kode).filter((j) => untukJenjang(hasil, j).some((b) => b.sub.length > 0));
  return {
    jumlahParagraf: isi.length,
    bab: [...new Set(bab)],
    kriteria,
    gaya: [...hitung.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, 10),
    jenjang,
  };
}

/**
 * Diagnosis dari paragraf dan hasil `uraiTemplate` (dengan atau tanpa pemetaan). `paragraf` null = berkas tidak
 * bisa dibuka sebagai dokumen Word.
 */
export function diagnosisTemplate(
  paragraf: ParagrafTemplate[] | null,
  hasil: BagianHasilTemplate[],
  opsi: { jenjang: string | null; tahun: number },
): DiagnosisTemplate {
  const kosong: RingkasanTemplate = { jumlahParagraf: 0, bab: [], kriteria: [], gaya: [], jenjang: [] };
  if (!paragraf) {
    return {
      kode: 'rusak', judul: 'Berkas rusak', bisaDipetakan: false, ringkasan: kosong,
      pesan: 'Berkas tidak bisa dibuka sebagai dokumen Word.',
      langkah: 'Simpan ulang sebagai .docx lalu unggah lagi.',
    };
  }
  const kriteria = hasil.filter((b) => b.jenis === 'kriteria').map((b) => b.nama);
  const ringkasan = ringkasTemplate(paragraf, hasil, kriteria.length ? kriteria : kriteriaTemplateCadangan(paragraf));
  const awal = paragraf.map((p) => rapi(p.teks)).filter(Boolean).slice(0, 12);
  if (jenisDocx(awal) !== 'template') {
    return {
      kode: 'bukan-template', judul: 'Bukan Template LED', bisaDipetakan: false, ringkasan,
      pesan: `Berkas ini bukan Template LED (terbaca: ${potong(awal.slice(0, 2).join(' · ') || 'tidak ada teks', 120)}).`,
      langkah: 'Unggah Template LEDPS dari LAM Teknik.',
    };
  }
  if (!kriteria.length) {
    // dengan pemetaan (I3) kriteria tetap kosong: format-lain, supaya Admin memperbaiki pemetaannya
    const lama = new Set(KRITERIA_LAMA.map(kunciKriteria));
    const samaLama = ringkasan.kriteria.filter((k) => lama.has(kunciKriteria(k))).length;
    if (samaLama >= 4) {
      return {
        kode: 'struktur-lama', judul: 'Struktur LED lama', bisaDipetakan: false, ringkasan,
        pesan: `Template ini memakai struktur LED lama (${ringkasan.kriteria.length} kriteria). Instrumen tahun ${opsi.tahun} memakai kriteria pada Matriks.`,
        langkah: `Unggah Template LEDPS LAM Teknik ${opsi.tahun} dari lamteknik.or.id.`,
      };
    }
    return {
      kode: 'format-lain', judul: 'Format judul tidak dikenali', bisaDipetakan: true, ringkasan,
      pesan: 'Format judul template ini berbeda dari template yang dikenal sistem.',
      langkah: 'Tentukan sendiri judulnya lewat Pemetaan judul, atau minta usulan AI.',
    };
  }
  if (opsi.jenjang && !ringkasan.jenjang.includes(opsi.jenjang)) {
    return {
      kode: 'jenjang-tidak-ada', judul: 'Jenjang tidak ada di template', bisaDipetakan: false, ringkasan,
      pesan: `Template terbaca (${kriteria.length} kriteria), tetapi tidak ada bagian untuk ${namaJenjang(opsi.jenjang)}. `
        + `Jenjang yang ada: ${ringkasan.jenjang.map(namaJenjang).join(', ') || '(tidak ada)'}.`,
      langkah: `Unggah Template LED yang memuat ${namaJenjang(opsi.jenjang)}, atau periksa catatan jenjang di template.`,
    };
  }
  return { kode: 'cocok', judul: 'Template terbaca', bisaDipetakan: false, ringkasan, pesan: `${kriteria.length} kriteria terbaca.`, langkah: '' };
}

/** Teks ringkasan untuk pesan galat: paragraf, BAB, kriteria, gaya judul. */
export function teksRingkasan(r: RingkasanTemplate): string {
  return [
    `${r.jumlahParagraf} paragraf`,
    `BAB: ${r.bab.join('; ') || '(tidak ditemukan)'}`,
    `kriteria: ${r.kriteria.join('; ') || '(tidak ditemukan)'}`,
    `gaya judul: ${r.gaya.map((g) => `${g.gaya} (${g.jumlah}, mis. "${g.contoh}")`).join('; ') || '(tidak ada)'}`,
  ].join('. ');
}
