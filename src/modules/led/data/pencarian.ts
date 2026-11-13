import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { ambilProyek } from "@/modules/led/data/proyek";
import { modelEmbeddingAktif } from "@/modules/bersama/data/kunci-api";
import { gabungRRF, kueriBm25, kueriGenerate, kueriKataKunci } from "@/modules/led/domain/rrf";
import { bacaVarian, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { literalVektor } from "@/modules/bersama/llm/embedding";
import { vektorKueri } from "@/modules/led/data/vektor-kueri";
import { kueriPerUnsur, pilihPerUnsur, type HasilKueri, type InfoPotongan, type KueriUnsur } from "@/modules/led/domain/kueri-unsur";
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

/** Seperti jalurVektorKonteks, beserta jarak kosinus (untuk ambang relevansi C-unsur). */
export async function jalurVektorKonteksJarak(l: LingkupCari, vektorKueri: number[], n: number): Promise<{ id: string; jarak: number }[]> {
  const v = literalVektor(vektorKueri);
  return prisma.$queryRaw<{ id: string; jarak: number }[]>`
    SELECT pt."id", (pt."embeddingKonteks" <=> ${v}::vector) AS "jarak" FROM "Potongan" pt
    JOIN "Dokumen" d ON d."id" = pt."dokumenId"
    WHERE (d."proyekId" = ${l.proyekId} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${l.model}
      AND pt."embeddingKonteks" IS NOT NULL
      AND (${l.subBagianKode}::text IS NULL OR d."subBagianKode" = ${l.subBagianKode} OR d."subBagianKode" IS NULL)
    ORDER BY pt."embeddingKonteks" <=> ${v}::vector, pt."id"
    LIMIT ${n}`;
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

/** Nama indeks BM25 pg_textsearch (migrasi 20261113130000); wajib eksplisit untuk prepared statement Prisma. */
export const INDEKS_BM25 = "Potongan_teksIndeks_bm25_idx";

/**
 * Jalur kata kunci konfigurasi B dan C (Rencana 10 Nov T5): BM25 pg_textsearch atas `teksIndeks` (kepala + teks).
 * Skor `<@>` negatif (lebih kecil = lebih relevan); potongan tanpa kata yang cocok (skor 0) dibuang.
 */
export async function jalurBm25(l: LingkupCari, kueri: string, n: number): Promise<string[]> {
  const q = kueriBm25(kueri);
  if (!q) return [];
  const baris = await prisma.$queryRaw<Baris[]>`
    SELECT s."id" FROM (
      SELECT pt."id", pt."teksIndeks" <@> to_bm25query(${q}, ${INDEKS_BM25}) AS "skor"
      FROM "Potongan" pt
      JOIN "Dokumen" d ON d."id" = pt."dokumenId"
      WHERE (d."proyekId" = ${l.proyekId} OR d."proyekId" IS NULL) AND d."status" = 'siap' AND pt."modelEmbedding" = ${l.model}
        AND pt."teksIndeks" IS NOT NULL
        AND (${l.subBagianKode}::text IS NULL OR d."subBagianKode" = ${l.subBagianKode} OR d."subBagianKode" IS NULL)
      ORDER BY pt."teksIndeks" <@> to_bm25query(${q}, ${INDEKS_BM25}), pt."id"
      LIMIT ${n}
    ) s
    WHERE s."skor" < 0
    ORDER BY s."skor", s."id"`;
  return baris.map((b) => b.id);
}

async function vektorTersimpan(teks: string[], model: string): Promise<Map<string, number[]>> {
  return (await vektorKueri(teks, { model })).vektor;
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
    // Rencana 10 Nov T6/T9: vektor kueri dibaca dari EmbeddingKueri (dibuat sekali bila belum ada)
    const v = vektorKueri ? await vektorKueri() : (await vektorTersimpan([kueri], l.model)).get(kueri)!;
    vektor = konf.vektor === "embeddingKonteks" ? await jalurVektorKonteks(l, v, n) : await jalurVektor(l, v, n);
  } catch (e) {
    catatan.push(`Pencarian vektor dilewati: ${e instanceof Error ? e.message : String(e)}`);
  }
  const kataKunci = konf.kataKunci === "bm25" ? await jalurBm25(l, kueri, n) : await jalurTsRank(l, kueri, n);
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

/** k bawaan konfigurasi C (PENCARIAN_K, bawaan 10). */
export function kUnsur(): number {
  const n = Number(process.env.PENCARIAN_K);
  return Number.isInteger(n) && n > 0 ? n : KONFIGURASI_PENCARIAN["C-unsur"].k;
}

/** Ambang kosinus relevansi (PENCARIAN_AMBANG_KOSINUS); 0 = mati (bawaan sampai dikalibrasi dari label T2). */
export function ambangKosinus(): number {
  const n = Number(process.env.PENCARIAN_AMBANG_KOSINUS ?? 0);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0;
}

/**
 * Inti konfigurasi C-unsur tanpa pemeriksaan akses (dipakai generate lewat cariPotonganUnsur, ekspor data uji, dan
 * skrip hitung): jalur setiap kueri dan pemilihan potongannya.
 */
export async function jalankanUnsur(l: LingkupCari, kueri: KueriUnsur[], opsi: OpsiCariUnsur & { k: number }) {
  const n = opsi.kandidat ?? 30;
  const ambang = opsi.ambang ?? ambangKosinus();
  const catatan: string[] = [];
  let vektor = new Map<string, number[]>();
  try {
    vektor = (await vektorKueri(kueri.map((q) => q.teks), { model: l.model })).vektor;
  } catch (e) {
    catatan.push(`Pencarian vektor dilewati: ${e instanceof Error ? e.message : String(e)}`);
  }
  const hasilKueri: HasilKueri[] = [];
  for (const q of kueri) {
    const v = vektor.get(q.teks);
    const vek = v ? await jalurVektorKonteksJarak(l, v, n) : [];
    hasilKueri.push({
      kueri: q,
      vektor: vek.filter((x) => ambang === 0 || 1 - x.jarak >= ambang).map((x) => x.id),
      kataKunci: await jalurBm25(l, q.teks, n),
    });
  }
  const ids = [...new Set(hasilKueri.flatMap((h) => [...h.vektor, ...h.kataKunci]))];
  const info = new Map<string, InfoPotongan>((ids.length === 0 ? [] : await prisma.potongan.findMany({
    where: { id: { in: ids } }, select: { id: true, urutan: true, dokumenId: true },
  })).map((x) => [x.id, { dokumenId: x.dokumenId, urutan: x.urutan }]));
  const pilih = pilihPerUnsur(hasilKueri, info, { k: opsi.k, maksPerDokumen: opsi.maksPerDokumen ?? 3 });
  return { hasilKueri, pilih, catatan };
}

/** Kueri C-unsur satu sub-bagian dari instrumen LED (tanpa pemeriksaan akses; untuk ekspor dan skrip). */
export async function kueriUnsurSubBagian(proyekId: string, subBagianKode: string): Promise<KueriUnsur[]> {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const s = await prisma.subBagian.findFirst({
    where: { kode: subBagianKode, bagian: { versiId: proyek.versiId } },
    include: { butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: true } } },
  });
  if (!s) throw new GalatPengguna("Sub-bagian tidak ada di LED ini.");
  const instruksi = gantiLabelTS(varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang)?.instruksi ?? "", proyek.tsTahunMulai);
  return kueriPerUnsur(s.judul, instruksi, s.butir.map((r) => r.butir).sort((a, b) => a.urutan - b.urutan));
}

export interface OpsiCariUnsur {
  subBagianKode?: string | null;
  k?: number;
  kandidat?: number;
  maksPerDokumen?: number;
  ambang?: number;
}

/**
 * Rencana 10 Nov T6, konfigurasi C-unsur: kueri umum + kueri per unsur skor 4; setiap kueri vektor (embeddingKonteks)
 * 30 teratas + BM25 30 teratas → RRF, semua kueri digabung RRF lagi; setiap unsur berkandidat dijamin 1 (bila ada 2)
 * potongan, paling banyak 3 per dokumen, potongan bertumpang tindih dilewati. Unsur tanpa kandidat (atau semua
 * kandidat vektornya di bawah ambang kosinus) dilaporkan sebagai "unsur tanpa bukti" (pra-cek, 0 token).
 */
export async function cariPotonganUnsur(p: Pengguna, proyekId: string, kueri: KueriUnsur[], opsi: OpsiCariUnsur = {}) {
  const proyek = await ambilProyek(p, proyekId);
  const k = opsi.k ?? kUnsur();
  const lingkup: LingkupCari = { proyekId: proyek.id, subBagianKode: opsi.subBagianKode ?? null, model: await modelEmbeddingAktif() };
  const { hasilKueri, pilih, catatan } = await jalankanUnsur(lingkup, kueri, { ...opsi, k });
  const semuaId = [...new Set(hasilKueri.flatMap((h) => [...h.vektor, ...h.kataKunci]))];
  const potongan = semuaId.length === 0 ? [] : await prisma.potongan.findMany({
    where: { id: { in: semuaId } },
    select: { id: true, teks: true, halaman: true, urutan: true, dokumen: { select: { id: true, namaBerkas: true, judul: true, subBagianKode: true, proyekId: true } } },
  });
  const peta = new Map(potongan.map((x) => [x.id, x]));
  const info = new Map<string, InfoPotongan>(potongan.map((x) => [x.id, { dokumenId: x.dokumen.id, urutan: x.urutan }]));
  const kueriPeta = new Map(kueri.map((q) => [q.kunci, q]));
  const asalTerpilih = new Map(pilih.terpilih.map((t) => [t.id, t.asal]));
  const terbaik = (id: string, jalur: "vektor" | "kataKunci") => {
    const posisi = hasilKueri.map((h) => h[jalur].indexOf(id)).filter((i) => i >= 0);
    return posisi.length ? Math.min(...posisi) + 1 : null;
  };
  const kandidat: KandidatPencarian[] = pilih.global.map((g, i) => {
    let asal = asalTerpilih.get(g.id);
    if (!asal) {
      let posisi = Infinity;
      for (const [kunci, urutan] of pilih.perKueri) {
        const j = urutan.indexOf(g.id);
        if (j >= 0 && j < posisi) { posisi = j; asal = kunci; }
      }
    }
    return {
      potonganId: g.id, dokumenId: info.get(g.id)?.dokumenId ?? "", peringkatVektor: terbaik(g.id, "vektor"),
      peringkatKataKunci: terbaik(g.id, "kataKunci"), peringkatGabungan: i + 1, skorRrf: Number(g.skor.toFixed(6)),
      unsur: kueriPeta.get(asal ?? "")?.unsur ?? null, masukKonteks: asalTerpilih.has(g.id),
    };
  });
  const jejak: JejakPencarian = { konfigurasi: "C-unsur", kueri: kueri.map((q) => q.teks), k, kandidat };
  const skor = new Map(pilih.global.map((g) => [g.id, g.skor]));
  const hasil: HasilCari[] = pilih.terpilih.flatMap((t) => {
    const x = peta.get(t.id);
    if (!x) return [];
    return [{
      potonganId: x.id, dokumenId: x.dokumen.id, namaBerkas: x.dokumen.namaBerkas, judul: x.dokumen.judul,
      subBagianKode: x.dokumen.subBagianKode, halaman: x.halaman, urutan: x.urutan, teks: x.teks,
      skor: Number((skor.get(t.id) ?? 0).toFixed(6)), peringkatVektor: terbaik(t.id, "vektor"),
      peringkatKataKunci: terbaik(t.id, "kataKunci"), bersama: x.dokumen.proyekId === null,
    }];
  });
  const unsurTanpaBukti = kueri.filter((q) => q.unsur !== null && !pilih.unsurBerkandidat.has(q.kunci))
    .map((q) => ({ butir: q.butir!, unsur: q.unsur! }));
  return { hasil, catatan, jejak, unsurTanpaBukti };
}

export async function cariPotongan(p: Pengguna, proyekId: string, kueri: string, opsi: OpsiCari = {}) {
  const proyek = await ambilProyek(p, proyekId);
  const k = opsi.k ?? 8;
  const kandidat = opsi.kandidat ?? 30;
  const konfigurasi = opsi.konfigurasi ?? konfigurasiBawaan(process.env.PENCARIAN_KONFIGURASI);
  if (konfigurasi === "C-unsur") {
    // teks bebas (Uji cari): satu kueri umum dengan batas per dokumen
    const r = await cariPotonganUnsur(p, proyekId, [{ kunci: "umum", butir: null, unsur: null, teks: kueri }], {
      subBagianKode: opsi.subBagianKode, k: opsi.k, kandidat: opsi.kandidat,
    });
    return { hasil: r.hasil, catatan: r.catatan, jejak: r.jejak };
  }
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
