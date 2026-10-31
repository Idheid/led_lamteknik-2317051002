import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { ambilProyek } from "@/modules/led/data/proyek";
import { modelEmbeddingAktif, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { gabungRRF, kueriGenerate, kueriKataKunci } from "@/modules/led/domain/rrf";
import { bacaVarian, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { literalVektor } from "@/modules/bersama/llm/embedding";

/**
 * F-11: pencarian gabungan potongan dokumen untuk RAG.
 * - vektor: jarak kosinus pgvector (indeks HNSW) terhadap embedding kueri;
 * - kata kunci: tsvector "simple" dengan kueri OR atas kata-kata kueri, diurutkan ts_rank;
 * - digabung dengan reciprocal rank fusion (k = 60).
 * Disaring per proyek; bila sub-bagian diberikan, hanya dokumen sub-bagian itu ditambah dokumen umum (tanpa sub-bagian).
 * U-10: dokumen bersama fakultas (proyekId kosong) ikut dicari untuk semua LED (kolom `bersama`).
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
  /** true bila potongan berasal dari dokumen bersama fakultas (U-10). */
  bersama: boolean;
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

/** Kueri yang dipakai generate untuk satu sub-bagian (uji cari "Pakai kueri generate"). */
export async function kueriSubBagian(p: Pengguna, proyekId: string, subBagianKode: string): Promise<string> {
  const proyek = await ambilProyek(p, proyekId);
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
  const sub = opsi.subBagianKode ?? null;
  const model = await modelEmbeddingAktif();
  const catatan: string[] = [];

  let vektor: string[] = [];
  try {
    const { penyedia } = await penyediaEmbedding();
    const v = literalVektor(await penyedia.embedKueri(kueri));
    const baris = await prisma.$queryRaw<Baris[]>`
      SELECT pt."id" FROM "Potongan" pt
      JOIN "Dokumen" d ON d."id" = pt."dokumenId"
      WHERE (d."proyekId" = ${proyek.id} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${model}
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
      WHERE (d."proyekId" = ${proyek.id} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${model}
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
    select: { id: true, teks: true, halaman: true, urutan: true, dokumen: { select: { id: true, namaBerkas: true, judul: true, subBagianKode: true, proyekId: true } } },
  });
  const peta = new Map(potongan.map((x) => [x.id, x]));
  const hasil: HasilCari[] = gabung.flatMap((g) => {
    const x = peta.get(g.id);
    if (!x) return [];
    return [{
      potonganId: x.id, dokumenId: x.dokumen.id, namaBerkas: x.dokumen.namaBerkas, judul: x.dokumen.judul,
      subBagianKode: x.dokumen.subBagianKode, halaman: x.halaman, urutan: x.urutan, teks: x.teks, skor: g.skor,
      peringkatVektor: g.peringkat[0], peringkatKataKunci: g.peringkat[1], bersama: x.dokumen.proyekId === null,
    }];
  });
  return { hasil, catatan };
}
