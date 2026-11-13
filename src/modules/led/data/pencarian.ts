import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { ambilProyek } from "@/modules/led/data/proyek";
import { modelEmbeddingAktif, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { gabungRRF, kueriGenerate, kueriKataKunci } from "@/modules/led/domain/rrf";
import { bacaVarian, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { literalVektor } from "@/modules/bersama/llm/embedding";
import {
  KONFIGURASI_PENCARIAN, konfigurasiBawaan,
  type JejakPencarian, type KandidatPencarian, type KodeKonfigurasi,
} from "@/modules/led/domain/konfigurasi-pencarian";

/**
 * F-11: pencarian gabungan potongan dokumen untuk RAG.
 * - vektor: jarak kosinus pgvector (indeks HNSW) terhadap embedding kueri;
 * - kata kunci: tsvector "simple" dengan kueri OR atas kata-kata kueri, diurutkan ts_rank;
 * - digabung dengan reciprocal rank fusion (k = 60).
 * Disaring per proyek; bila sub-bagian diberikan, hanya dokumen sub-bagian itu ditambah dokumen umum (tanpa sub-bagian).
 * U-10: dokumen bersama fakultas (proyekId kosong) ikut dicari untuk semua LED (kolom `bersama`).
 * Hanya potongan dengan model embedding yang berlaku yang dipakai (setelah ganti model, dokumen diproses ulang).
 * Rencana 10 Nov T2: jalur dijalankan menurut konfigurasi bernama (domain/konfigurasi-pencarian.ts) dan setiap
 * pencarian menghasilkan jejak (kueri, k, kandidat beserta peringkat per jalur) yang disimpan di versi draf.
 */

export interface HasilCari {
  potonganId: string;
  dokumenId: string;
  namaBerkas: string;
  judul: string | null;
  subBagianKode: string | null;
  halaman: number | null;
  urutan: number;
  teks: string;
  skor: number;
  peringkatVektor: number | null;
  peringkatKataKunci: number | null;
  /** true bila potongan berasal dari dokumen bersama fakultas (U-10). */
  bersama: boolean;
}

export interface OpsiCari {
  subBagianKode?: string | null;
  /** jumlah hasil akhir (spesifikasi: 6–8 potongan teratas) */
  k?: number;
  /** kandidat per jalur sebelum digabung */
  kandidat?: number;
  /** konfigurasi pencarian; bawaan PENCARIAN_KONFIGURASI atau konfigurasi aktif terakhir */
  konfigurasi?: KodeKonfigurasi;
}

interface Baris {
  id: string;
}

/** Lingkup pencarian satu LED: proyek, sub-bagian (opsional), dan model embedding yang berlaku. */
export interface LingkupCari {
  proyekId: string;
  subBagianKode: string | null;
  model: string;
}

/** Jalur vektor konfigurasi A: kolom `embedding` (teks potongan saja). */
export async function jalurVektor(l: LingkupCari, vektorKueri: number[], n: number): Promise<string[]> {
  const v = literalVektor(vektorKueri);
  const baris = await prisma.$queryRaw<Baris[]>`
    SELECT pt."id" FROM "Potongan" pt
    JOIN "Dokumen" d ON d."id" = pt."dokumenId"
    WHERE (d."proyekId" = ${l.proyekId} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${l.model}
      AND pt."embedding" IS NOT NULL
      AND (${l.subBagianKode}::text IS NULL OR d."subBagianKode" = ${l.subBagianKode} OR d."subBagianKode" IS NULL)
    ORDER BY pt."embedding" <=> ${v}::vector, pt."id"
    LIMIT ${n}`;
  return baris.map((b) => b.id);
}

/** Jalur vektor konfigurasi B dan C (Rencana 10 Nov T4): kolom `embeddingKonteks` (kepala + teks potongan). */
export async function jalurVektorKonteks(l: LingkupCari, vektorKueri: number[], n: number): Promise<string[]> {
  const v = literalVektor(vektorKueri);
  const baris = await prisma.$queryRaw<Baris[]>`
    SELECT pt."id" FROM "Potongan" pt
    JOIN "Dokumen" d ON d."id" = pt."dokumenId"
    WHERE (d."proyekId" = ${l.proyekId} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${l.model}
      AND pt."embeddingKonteks" IS NOT NULL
      AND (${l.subBagianKode}::text IS NULL OR d."subBagianKode" = ${l.subBagianKode} OR d."subBagianKode" IS NULL)
    ORDER BY pt."embeddingKonteks" <=> ${v}::vector, pt."id"
    LIMIT ${n}`;
  return baris.map((b) => b.id);
}

/** Jalur kata kunci konfigurasi A: ts_rank atas `teksTsv`. */
export async function jalurTsRank(l: LingkupCari, kueri: string, n: number): Promise<string[]> {
  const q = kueriKataKunci(kueri);
  if (!q) return [];
  const baris = await prisma.$queryRaw<Baris[]>`
    SELECT pt."id" FROM "Potongan" pt
    JOIN "Dokumen" d ON d."id" = pt."dokumenId"
    WHERE (d."proyekId" = ${l.proyekId} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${l.model}
      AND (${l.subBagianKode}::text IS NULL OR d."subBagianKode" = ${l.subBagianKode} OR d."subBagianKode" IS NULL)
      AND pt."teksTsv" @@ to_tsquery('simple', ${q})
    ORDER BY ts_rank(pt."teksTsv", to_tsquery('simple', ${q})) DESC, pt."id"
    LIMIT ${n}`;
  return baris.map((b) => b.id);
}

export interface HasilJalur {
  /** id potongan per jalur, terurut dari peringkat 1 */
  vektor: string[];
  kataKunci: string[];
  catatan: string[];
}

/** Jalankan jalur-jalur satu konfigurasi untuk satu kueri (tanpa menggabung). */
export async function jalankanJalur(
  l: LingkupCari,
  konfigurasi: KodeKonfigurasi,
  kueri: string,
  n: number,
  vektorKueri?: () => Promise<number[]>,
): Promise<HasilJalur> {
  const konf = KONFIGURASI_PENCARIAN[konfigurasi];
  if (!konf.aktif) throw new GalatPengguna(`Konfigurasi pencarian ${konfigurasi} belum aktif.`);
  const catatan: string[] = [];
  let vektor: string[] = [];
  try {
    const v = vektorKueri ? await vektorKueri() : await (await penyediaEmbedding()).penyedia.embedKueri(kueri);
    vektor = await jalurVektor(l, v, n);
  } catch (e) {
    catatan.push(`Pencarian vektor dilewati: ${e instanceof Error ? e.message : String(e)}`);
  }
  const kataKunci = await jalurTsRank(l, kueri, n);
  return { vektor, kataKunci, catatan };
}

/** Gabungkan dua jalur dengan RRF menjadi kandidat berperingkat; k teratas ditandai masuk konteks. */
export function kandidatDariJalur(j: HasilJalur, k: number, dokumenPotongan: Map<string, string>): KandidatPencarian[] {
  return gabungRRF([j.vektor, j.kataKunci]).map((g, i) => ({
    potonganId: g.id,
    dokumenId: dokumenPotongan.get(g.id) ?? "",
    peringkatVektor: g.peringkat[0],
    peringkatKataKunci: g.peringkat[1],
    peringkatGabungan: i + 1,
    skorRrf: Number(g.skor.toFixed(6)),
    unsur: null,
    masukKonteks: i < k,
  }));
}

/** Kueri yang dipakai generate untuk satu sub-bagian (uji cari "Pakai kueri generate"). */
export async function kueriSubBagian(p: Pengguna, proyekId: string, subBagianKode: string): Promise<string> {
  const proyek = await ambilProyek(p, proyekId, { baca: true });
  const s = await prisma.subBagian.findFirst({
    where: { kode: subBagianKode, bagian: { versiId: proyek.versiId } },
    include: { butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: true } } },
  });
  if (!s) throw new GalatPengguna("Sub-bagian tidak ada di LED ini.");
  const instruksi = gantiLabelTS(varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang)?.instruksi ?? "", proyek.tsTahunMulai);
  return kueriGenerate(s.judul, instruksi, s.butir.map((r) => r.butir).sort((a, b) => a.urutan - b.urutan));
}

export async function cariPotongan(p: Pengguna, proyekId: string, kueri: string, opsi: OpsiCari = {}) {
  const proyek = await ambilProyek(p, proyekId);
  const k = opsi.k ?? 8;
  const kandidat = opsi.kandidat ?? 30;
  const konfigurasi = opsi.konfigurasi ?? konfigurasiBawaan(process.env.PENCARIAN_KONFIGURASI);
  const lingkup: LingkupCari = { proyekId: proyek.id, subBagianKode: opsi.subBagianKode ?? null, model: await modelEmbeddingAktif() };
  const jalur = await jalankanJalur(lingkup, konfigurasi, kueri, kandidat);
  const semuaId = [...new Set([...jalur.vektor, ...jalur.kataKunci])];
  const potongan = semuaId.length === 0 ? [] : await prisma.potongan.findMany({
    where: { id: { in: semuaId } },
    select: { id: true, teks: true, halaman: true, urutan: true, dokumen: { select: { id: true, namaBerkas: true, judul: true, subBagianKode: true, proyekId: true } } },
  });
  const peta = new Map(potongan.map((x) => [x.id, x]));
  const daftar = kandidatDariJalur(jalur, k, new Map(potongan.map((x) => [x.id, x.dokumen.id])));
  const jejak: JejakPencarian = { konfigurasi, kueri: [kueri], k, kandidat: daftar };
  const hasil: HasilCari[] = daftar.filter((c) => c.masukKonteks).flatMap((c) => {
    const x = peta.get(c.potonganId);
    if (!x) return [];
    return [{
      potonganId: x.id, dokumenId: x.dokumen.id, namaBerkas: x.dokumen.namaBerkas, judul: x.dokumen.judul,
      subBagianKode: x.dokumen.subBagianKode, halaman: x.halaman, urutan: x.urutan, teks: x.teks, skor: c.skorRrf,
      peringkatVektor: c.peringkatVektor, peringkatKataKunci: c.peringkatKataKunci, bersama: x.dokumen.proyekId === null,
    }];
  });
  return { hasil, catatan: jalur.catatan, jejak };
}
