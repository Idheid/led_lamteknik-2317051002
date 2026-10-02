import { prisma } from "@/lib/db";
import type { Pengguna } from "@/lib/akses";
import { ambilProyek } from "@/lib/data/proyek";
import { modelEmbeddingAktif, penyediaUntukProdi } from "@/lib/data/kunci-api";
import { gabungRRF, kueriKataKunci } from "@/lib/domain/rrf";
import { literalVektor } from "@/lib/llm/embedding";

/**
 * F-11: pencarian gabungan potongan dokumen untuk RAG.
 * - vektor: jarak kosinus pgvector (indeks HNSW) terhadap embedding kueri;
 * - kata kunci: tsvector "simple" dengan kueri OR atas kata-kata kueri, diurutkan ts_rank;
 * - digabung dengan reciprocal rank fusion (k = 60).
 * Disaring per proyek; bila sub-bagian diberikan, hanya dokumen sub-bagian itu ditambah dokumen umum (tanpa sub-bagian).
 * Hanya potongan dengan model embedding yang berlaku yang dipakai (setelah ganti model, dokumen diproses ulang).
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
}

export interface OpsiCari {
  subBagianKode?: string | null;
  /** jumlah hasil akhir (spesifikasi: 6–8 potongan teratas) */
  k?: number;
  /** kandidat per metode sebelum digabung */
  kandidat?: number;
}

interface Baris {
  id: string;
}

export async function cariPotongan(p: Pengguna, proyekId: string, kueri: string, opsi: OpsiCari = {}) {
  const proyek = await ambilProyek(p, proyekId);
  const k = opsi.k ?? 8;
  const kandidat = opsi.kandidat ?? 30;
  const sub = opsi.subBagianKode ?? null;
  const model = await modelEmbeddingAktif();
  const catatan: string[] = [];

  let vektor: string[] = [];
  try {
    const { penyedia } = await penyediaUntukProdi(proyek.prodiId);
    const v = literalVektor(await penyedia.embedKueri(kueri));
    const baris = await prisma.$queryRaw<Baris[]>`
      SELECT pt."id" FROM "Potongan" pt
      JOIN "Dokumen" d ON d."id" = pt."dokumenId"
      WHERE d."proyekId" = ${proyek.id} AND d."status" = 'siap' AND pt."modelEmbedding" = ${model}
        AND pt."embedding" IS NOT NULL
        AND (${sub}::text IS NULL OR d."subBagianKode" = ${sub} OR d."subBagianKode" IS NULL)
      ORDER BY pt."embedding" <=> ${v}::vector
      LIMIT ${kandidat}`;
    vektor = baris.map((b) => b.id);
  } catch (e) {
    catatan.push(`Pencarian vektor dilewati: ${e instanceof Error ? e.message : String(e)}`);
  }

  let kataKunci: string[] = [];
  const q = kueriKataKunci(kueri);
  if (q) {
    const baris = await prisma.$queryRaw<Baris[]>`
      SELECT pt."id" FROM "Potongan" pt
      JOIN "Dokumen" d ON d."id" = pt."dokumenId"
      WHERE d."proyekId" = ${proyek.id} AND d."status" = 'siap' AND pt."modelEmbedding" = ${model}
        AND (${sub}::text IS NULL OR d."subBagianKode" = ${sub} OR d."subBagianKode" IS NULL)
        AND pt."teksTsv" @@ to_tsquery('simple', ${q})
      ORDER BY ts_rank(pt."teksTsv", to_tsquery('simple', ${q})) DESC, pt."id"
      LIMIT ${kandidat}`;
    kataKunci = baris.map((b) => b.id);
  }

  const gabung = gabungRRF([vektor, kataKunci]).slice(0, k);
  if (gabung.length === 0) return { hasil: [] as HasilCari[], catatan };
  const potongan = await prisma.potongan.findMany({
    where: { id: { in: gabung.map((g) => g.id) } },
    select: { id: true, teks: true, halaman: true, urutan: true, dokumen: { select: { id: true, namaBerkas: true, judul: true, subBagianKode: true } } },
  });
  const peta = new Map(potongan.map((x) => [x.id, x]));
  const hasil: HasilCari[] = gabung.flatMap((g) => {
    const x = peta.get(g.id);
    if (!x) return [];
    return [{
      potonganId: x.id, dokumenId: x.dokumen.id, namaBerkas: x.dokumen.namaBerkas, judul: x.dokumen.judul,
      subBagianKode: x.dokumen.subBagianKode, halaman: x.halaman, urutan: x.urutan, teks: x.teks, skor: g.skor,
      peringkatVektor: g.peringkat[0], peringkatKataKunci: g.peringkat[1],
    }];
  });
  return { hasil, catatan };
}
