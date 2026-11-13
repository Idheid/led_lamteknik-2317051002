import { gabungRRF, type HasilGabung } from './rrf';

/**
 * Rencana 10 Nov T6 (konfigurasi C-unsur): satu kueri umum + satu kueri per unsur skor 4, supaya potongan untuk satu
 * unsur tidak menenggelamkan unsur lain (berbeda dengan kueriGenerate, satu kueri gabungan ≤ 1.500 karakter).
 */

export interface KueriUnsur {
  /** "umum" atau "<kode butir>#<nomor unsur>" */
  kunci: string;
  butir: string | null;
  unsur: string | null;
  teks: string;
}

export function kueriPerUnsur(
  judul: string,
  instruksi: string,
  butir: { kode: string; indikator: string; unsurSkor4: string[] }[],
): KueriUnsur[] {
  const umum = [judul, instruksi.slice(0, 400)].filter((x) => x.trim()).join('. ');
  return [
    { kunci: 'umum', butir: null, unsur: null, teks: umum },
    ...butir.flatMap((b) => b.unsurSkor4.map((u, i) => ({ kunci: `${b.kode}#${i + 1}`, butir: b.kode, unsur: u, teks: `${b.indikator}. ${u}` }))),
  ];
}

export interface HasilKueri {
  kueri: KueriUnsur;
  /** id potongan per jalur, terurut dari peringkat 1 */
  vektor: string[];
  kataKunci: string[];
}

export interface InfoPotongan {
  dokumenId: string;
  urutan: number;
}

export interface OpsiPilih {
  /** jumlah akhir (bawaan 10) */
  k: number;
  /** paling banyak potongan dari dokumen yang sama (bawaan 3) */
  maksPerDokumen: number;
}

export interface Terpilih {
  id: string;
  /** kunci kueri asal: unsur yang dijamin, atau kueri dengan peringkat terbaik */
  asal: string;
  /** dipilih karena jaminan unsur atau dari peringkat gabungan */
  alasan: 'unsur' | 'gabungan';
}

export interface HasilPilih {
  terpilih: Terpilih[];
  /** gabungan RRF dari peringkat semua kueri (untuk jejak) */
  global: HasilGabung[];
  /** urutan gabungan (RRF vektor + kata kunci) setiap kueri */
  perKueri: Map<string, string[]>;
  /** unsur yang punya minimal satu kandidat */
  unsurBerkandidat: Set<string>;
}

/**
 * Pilih potongan untuk konteks generate:
 * 1. setiap kueri: RRF (k = 60) jalur vektor dan kata kunci; semua kueri digabung lagi dengan RRF;
 * 2. setiap unsur yang punya kandidat dijamin 1 potongan (putaran 1, boleh melebihi k bila unsur sangat banyak),
 *    lalu 1 lagi bila masih ada ruang (putaran 2);
 * 3. sisa ruang sampai k diisi dari peringkat gabungan;
 * selalu: paling banyak `maksPerDokumen` potongan per dokumen, dan potongan yang bertumpang tindih (urutan bersebelahan
 * di dokumen yang sama, karena pemotongan bertumpang tindih ± 15%) dengan potongan terpilih dilewati.
 */
export function pilihPerUnsur(hasil: HasilKueri[], info: Map<string, InfoPotongan>, opsi: OpsiPilih): HasilPilih {
  const perKueri = new Map(hasil.map((h) => [h.kueri.kunci, gabungRRF([h.vektor, h.kataKunci]).map((g) => g.id)]));
  const global = gabungRRF([...perKueri.values()]);
  const terpilih: Terpilih[] = [];
  const dipilih = new Set<string>();
  const perDokumen = new Map<string, number[]>();

  const boleh = (id: string) => {
    if (dipilih.has(id)) return false;
    const x = info.get(id);
    if (!x) return false;
    const urutan = perDokumen.get(x.dokumenId) ?? [];
    if (urutan.length >= opsi.maksPerDokumen) return false;
    return !urutan.some((u) => Math.abs(u - x.urutan) <= 1);
  };
  const ambil = (id: string, asal: string, alasan: Terpilih['alasan']) => {
    const x = info.get(id)!;
    dipilih.add(id);
    perDokumen.set(x.dokumenId, [...(perDokumen.get(x.dokumenId) ?? []), x.urutan]);
    terpilih.push({ id, asal, alasan });
  };

  const unsur = hasil.filter((h) => h.kueri.unsur !== null);
  const unsurBerkandidat = new Set(unsur.filter((h) => (perKueri.get(h.kueri.kunci) ?? []).length > 0).map((h) => h.kueri.kunci));
  for (const putaran of [1, 2]) {
    for (const h of unsur) {
      if (putaran === 2 && terpilih.length >= opsi.k) break;
      const calon = (perKueri.get(h.kueri.kunci) ?? []).find(boleh);
      if (calon) ambil(calon, h.kueri.kunci, 'unsur');
    }
  }
  // asal kandidat gabungan = kueri tempat peringkatnya paling baik
  const asalTerbaik = (id: string) => {
    let terbaik = 'umum';
    let posisi = Infinity;
    for (const [kunci, urutan] of perKueri) {
      const i = urutan.indexOf(id);
      if (i >= 0 && i < posisi) { posisi = i; terbaik = kunci; }
    }
    return terbaik;
  };
  for (const g of global) {
    if (terpilih.length >= opsi.k) break;
    if (boleh(g.id)) ambil(g.id, asalTerbaik(g.id), 'gabungan');
  }
  // urutan konteks mengikuti peringkat gabungan
  const posisiGlobal = new Map(global.map((g, i) => [g.id, i]));
  terpilih.sort((a, b) => (posisiGlobal.get(a.id) ?? 0) - (posisiGlobal.get(b.id) ?? 0));
  return { terpilih, global, perKueri, unsurBerkandidat };
}

/**
 * Urutan sistem konfigurasi C untuk evaluasi: potongan terpilih (konteks generate, urut peringkat gabungan) lebih dulu,
 * lalu sisa peringkat gabungan. Dengan begitu "k sistem teratas" = persis potongan yang dipakai generate.
 */
export function urutanSistemUnsur(p: Pick<HasilPilih, 'terpilih' | 'global'>): string[] {
  const dipakai = p.terpilih.map((t) => t.id);
  const set = new Set(dipakai);
  return [...dipakai, ...p.global.map((g) => g.id).filter((id) => !set.has(id))];
}

/** Penanda draf deterministik "tanpa AI" bila semua unsur tanpa bukti dan tidak ada J, M, maupun T. */
export function drafTanpaBukti(unsur: { butir: string; unsur: string }[], dokumenDiharapkan: string[]): { teks: string; sumber: string[] }[] {
  const paragraf = unsur.map((u) => ({ teks: `[BELUM ADA BUKTI: ${u.unsur}] (butir ${u.butir})`, sumber: [] as string[] }));
  if (dokumenDiharapkan.length) {
    paragraf.push({ teks: `Dokumen yang diharapkan untuk bagian ini: ${dokumenDiharapkan.join('; ')}.`, sumber: [] });
  }
  return paragraf;
}
