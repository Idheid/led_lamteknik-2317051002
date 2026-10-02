/**
 * Daftar model Google (endpoint models.list) untuk menu Model LLM super admin.
 * - Model narasi dan cadangan: mendukung generateContent.
 * - Model embedding: mendukung embedContent.
 * Model 2.5 dibatasi Google untuk pengguna baru, jadi model bawaan narasi dipilih dari keluarga 3.x.
 */

export interface ModelGoogle {
  /** Kode tanpa awalan "models/", misalnya "gemini-3-flash-preview". */
  kode: string;
  nama: string;
  deskripsi: string;
  metode: string[];
  batasMasuk: number | null;
  batasKeluar: number | null;
}

interface ModelMentah {
  name?: unknown;
  displayName?: unknown;
  description?: unknown;
  supportedGenerationMethods?: unknown;
  inputTokenLimit?: unknown;
  outputTokenLimit?: unknown;
}

/** Ubah respons models.list menjadi daftar model yang rapi (urut kode). */
export function bacaDaftarModel(json: unknown): ModelGoogle[] {
  const models = (json as { models?: ModelMentah[] } | null)?.models;
  if (!Array.isArray(models)) return [];
  return models
    .filter((m) => typeof m.name === 'string')
    .map((m) => ({
      kode: String(m.name).replace(/^models\//, ''),
      nama: typeof m.displayName === 'string' ? m.displayName : String(m.name),
      deskripsi: typeof m.description === 'string' ? m.description : '',
      metode: Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods.filter((x): x is string => typeof x === 'string') : [],
      batasMasuk: typeof m.inputTokenLimit === 'number' ? m.inputTokenLimit : null,
      batasKeluar: typeof m.outputTokenLimit === 'number' ? m.outputTokenLimit : null,
    }))
    .sort((a, b) => a.kode.localeCompare(b.kode));
}

/** Model yang tidak cocok untuk menyusun teks walau mendukung generateContent (gambar, suara, robotika, dsb.). */
const BUKAN_TEKS = /(image|tts|audio|live|native|robotics|computer-use|veo|imagen|aqa|learnlm|embedding|vision|nano-banana|lyria)/i;

export function modelNarasi(daftar: ModelGoogle[]): ModelGoogle[] {
  return daftar.filter((m) => m.metode.includes('generateContent') && /^gemini|^gemma/i.test(m.kode) && !BUKAN_TEKS.test(m.kode));
}

export function modelEmbedding(daftar: ModelGoogle[]): ModelGoogle[] {
  return daftar.filter((m) => m.metode.includes('embedContent') || m.metode.includes('batchEmbedContents'));
}

/** Versi model gemini (3.1 dari "gemini-3.1-flash"), 0 bila tidak dikenali. */
export function versiModel(kode: string): number {
  const m = /^gemini-(\d+(?:\.\d+)?)/.exec(kode);
  return m ? Number(m[1]) : 0;
}

/** Penjelasan singkat fungsi model untuk penyusun skripsi (bahasa sehari-hari). */
export function penjelasanModel(kode: string): string {
  const k = kode.toLowerCase();
  if (/embedding/.test(k)) return 'Mengubah potongan dokumen menjadi vektor untuk pencarian sumber (RAG). Mengganti model ini memproses ulang semua dokumen.';
  if (/^gemma/.test(k)) return 'Model terbuka ringan; kualitas bahasa Indonesia di bawah Gemini. Cocok sebagai cadangan terakhir.';
  const pratinjau = /preview|exp/.test(k) ? ' Versi pratinjau: bisa berubah atau dihentikan Google.' : '';
  if (/flash-lite/.test(k)) return `Paling hemat dan cepat, kuota gratis paling longgar; narasi lebih sederhana. Cocok sebagai cadangan.${pratinjau}`;
  if (/flash/.test(k)) return `Seimbang antara kualitas dan kecepatan, tersedia di kuota gratis. Disarankan untuk menyusun narasi.${pratinjau}`;
  if (/pro/.test(k)) return `Paling teliti untuk penalaran panjang, tetapi lebih lambat dan kuota gratisnya kecil atau tidak tersedia.${pratinjau}`;
  return `Model Gemini umum.${pratinjau}`;
}

function nilaiNarasi(m: ModelGoogle): number {
  const k = m.kode;
  let n = versiModel(k) * 100;
  if (/flash-lite/.test(k)) n += 10;
  else if (/flash/.test(k)) n += 30;
  else if (/pro/.test(k)) n += 5; // pro: kuota gratis kecil
  if (/latest/.test(k)) n += 2;
  if (/preview|exp/.test(k)) n -= 1; // utamakan versi stabil bila ada
  if (/\d{3,}$/.test(k)) n -= 3; // versi bertanggal (snapshot)
  return n;
}

/**
 * Model narasi bawaan: keluarga Gemini 3.x jenis flash (stabil lebih dulu daripada pratinjau),
 * lalu flash-lite; null bila tidak ada model 3.x.
 */
export function pilihModelNarasiBawaan(daftar: ModelGoogle[]): string | null {
  const calon = modelNarasi(daftar).filter((m) => versiModel(m.kode) >= 3 && /flash/.test(m.kode));
  if (calon.length === 0) return null;
  return [...calon].sort((a, b) => nilaiNarasi(b) - nilaiNarasi(a))[0].kode;
}

/** Cadangan bawaan: model narasi lain (urut nilai), maksimal dua, tanpa model utama. */
export function pilihCadanganBawaan(daftar: ModelGoogle[], utama: string): string[] {
  return modelNarasi(daftar)
    .filter((m) => m.kode !== utama && versiModel(m.kode) >= 3)
    .sort((a, b) => nilaiNarasi(b) - nilaiNarasi(a))
    .slice(0, 2)
    .map((m) => m.kode);
}

export function pilihEmbeddingBawaan(daftar: ModelGoogle[]): string | null {
  const e = modelEmbedding(daftar).map((m) => m.kode);
  return e.find((k) => k === 'gemini-embedding-001') ?? e.find((k) => /^gemini-embedding/.test(k)) ?? e[0] ?? null;
}

/** Model 2.5 dibatasi untuk pengguna baru: anggap perlu diganti. */
export function modelUsang(kode: string): boolean {
  return /^gemini-(1|2)(\.|-)/.test(kode);
}
