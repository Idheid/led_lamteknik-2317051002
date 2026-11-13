/**
 * Rencana 10 Nov T2: precision@k dan recall@k tahap pengambilan dokumen (rumusan masalah 2), dihitung terhadap potongan
 * yang dilabel relevan oleh manusia. Label tidak pernah dibuat sistem.
 *
 * - Peringkat yang dinilai: peringkat gabungan (RRF) tiap konfigurasi, yaitu urutan yang dipakai sistem.
 * - precision@k = jumlah potongan relevan di k teratas / k.
 * - recall@k = jumlah potongan relevan di k teratas / jumlah semua potongan berlabel relevan di pool sub-bagian itu.
 *   Pool = gabungan k teratas dari setiap jalur di setiap konfigurasi yang diekspor; potongan relevan di luar pool tidak
 *   diketahui (batasan pooling).
 * - Potongan tanpa label dihitung tidak relevan dan jumlahnya dilaporkan.
 * - Sub-bagian tanpa potongan relevan tidak ikut rata-rata recall (pembagi nol), tetapi ikut rata-rata precision.
 * - Rata-rata = rerata makro antar-sub-bagian.
 */

export interface BarisBerlabel {
  /** kunci sub-bagian (misalnya "LED Teknik Sipil 2031 | C.1-LB") */
  subBagian: string;
  potonganId: string;
  /** 1 relevan, 0 tidak relevan, null belum dilabel */
  relevan: 0 | 1 | null;
}

/** Peringkat gabungan per konfigurasi, per sub-bagian: indeks i = peringkat i+1 (boleh berlubang bila di luar pool). */
export type PeringkatKonfigurasi = Record<string, Record<string, string[]>>;

export interface HasilSubBagian {
  subBagian: string;
  konfigurasi: string;
  jumlahRelevan: number;
  /** k → nilai; recall null bila sub-bagian tidak punya potongan relevan */
  precision: Record<string, number>;
  recall: Record<string, number | null>;
  tanpaLabelDiAtas: number;
}

export interface HasilRetrieval {
  perSubBagian: HasilSubBagian[];
  /** konfigurasi → k → rata-rata */
  rata: Record<string, Record<string, { precision: number; recall: number | null; nPrecision: number; nRecall: number }>>;
  barisTanpaLabel: number;
  subBagianTanpaRelevan: string[];
  /** nilai k yang dihitung (label kolom), misalnya ["1", "3", "5", "8"] */
  kolomK: string[];
}

export function hitungRetrieval(
  label: BarisBerlabel[],
  peringkat: PeringkatKonfigurasi,
  daftarK: number[],
): HasilRetrieval {
  const relevan = new Map<string, Set<string>>();
  const berlabel = new Map<string, Set<string>>();
  let barisTanpaLabel = 0;
  for (const b of label) {
    if (b.relevan === null) { barisTanpaLabel++; continue; }
    if (!berlabel.has(b.subBagian)) berlabel.set(b.subBagian, new Set());
    berlabel.get(b.subBagian)!.add(b.potonganId);
    if (b.relevan === 1) {
      if (!relevan.has(b.subBagian)) relevan.set(b.subBagian, new Set());
      relevan.get(b.subBagian)!.add(b.potonganId);
    }
  }
  const kUnik = [...new Set(daftarK)].sort((a, b) => a - b);
  const kolomK = kUnik.map(String);
  const perSubBagian: HasilSubBagian[] = [];
  const subTanpa = new Set<string>();
  for (const [konf, perSub] of Object.entries(peringkat)) {
    for (const [sub, urutan] of Object.entries(perSub)) {
      if (!berlabel.has(sub)) continue; // sub-bagian tanpa label sama sekali tidak dinilai
      const rel = relevan.get(sub) ?? new Set<string>();
      if (rel.size === 0) subTanpa.add(sub);
      const precision: Record<string, number> = {};
      const recall: Record<string, number | null> = {};
      let tanpaLabelDiAtas = 0;
      const lab = berlabel.get(sub)!;
      for (const k of kUnik) {
        const atas = urutan.slice(0, k);
        const cocok = atas.filter((id) => id !== undefined && rel.has(id)).length;
        precision[String(k)] = cocok / k;
        recall[String(k)] = rel.size ? cocok / rel.size : null;
      }
      tanpaLabelDiAtas = urutan.slice(0, Math.max(...kUnik)).filter((id) => id !== undefined && !lab.has(id)).length;
      perSubBagian.push({ subBagian: sub, konfigurasi: konf, jumlahRelevan: rel.size, precision, recall, tanpaLabelDiAtas });
    }
  }
  const rata: HasilRetrieval['rata'] = {};
  for (const konf of Object.keys(peringkat)) {
    const baris = perSubBagian.filter((h) => h.konfigurasi === konf);
    rata[konf] = {};
    for (const k of kolomK) {
      const p = baris.map((h) => h.precision[k]);
      const r = baris.map((h) => h.recall[k]).filter((x): x is number => x !== null);
      rata[konf][k] = {
        precision: p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0,
        recall: r.length ? r.reduce((a, b) => a + b, 0) / r.length : null,
        nPrecision: p.length,
        nRecall: r.length,
      };
    }
  }
  return { perSubBagian, rata, barisTanpaLabel, subBagianTanpaRelevan: [...subTanpa].sort(), kolomK };
}

const angka = (x: number | null) => (x === null ? '–' : x.toFixed(3).replace('.', ','));

/** Tabel Markdown siap tempel ke Bab IV. */
export function tabelMarkdown(h: HasilRetrieval, kSistem: Record<string, number>): string {
  const kepala = ['Konfigurasi', ...h.kolomK.flatMap((k) => [`P@${k}`, `R@${k}`]), 'Sub-bagian (P / R)'];
  const garis = kepala.map(() => '---');
  const baris = Object.entries(h.rata).map(([konf, perK]) => {
    const n = Object.values(perK)[0];
    return [
      `${konf}${kSistem[konf] ? ` (k sistem = ${kSistem[konf]})` : ''}`,
      ...h.kolomK.flatMap((k) => [angka(perK[k].precision), angka(perK[k].recall)]),
      n ? `${n.nPrecision} / ${n.nRecall}` : '0 / 0',
    ];
  });
  const catatan = [
    '',
    `Recall dihitung terhadap potongan berlabel relevan di pool (gabungan kandidat semua jalur dan konfigurasi yang diekspor); potongan relevan di luar pool tidak diketahui.`,
    `Baris tanpa label: ${h.barisTanpaLabel} (dihitung tidak relevan bila muncul di k teratas).`,
    `Sub-bagian tanpa potongan relevan (tidak ikut rata-rata recall): ${h.subBagianTanpaRelevan.length}.`,
  ];
  return [kepala, garis, ...baris].map((b) => `| ${b.join(' | ')} |`).join('\n') + '\n' + catatan.join('\n') + '\n';
}

// ------------------------------------------------------------------ dari CSV data uji (ekspor T2)

/** Kunci sub-bagian di CSV: LED (id) + kode sub-bagian. */
export function kunciSubBagian(b: Record<string, string>): string {
  return `${b.led_id || b.led} | ${b.sub_bagian}`;
}

/** Nilai kolom relevan: 1/0 (juga "ya"/"tidak"), kosong = belum dilabel. Nilai lain ditolak supaya salah ketik terlihat. */
export function bacaRelevan(nilai: string): 0 | 1 | null {
  const v = nilai.trim().toLowerCase();
  if (v === '') return null;
  if (v === '1' || v === 'ya' || v === 'y') return 1;
  if (v === '0' || v === 'tidak' || v === 't') return 0;
  throw new Error(`Nilai kolom relevan tidak dikenal: "${nilai}" (isi 1 atau 0).`);
}

export function labelDariCsv(baris: Record<string, string>[]): BarisBerlabel[] {
  return baris.map((b, i) => {
    try {
      return { subBagian: kunciSubBagian(b), potonganId: b.potongan_id, relevan: bacaRelevan(b.relevan ?? '') };
    } catch (e) {
      throw new Error(`Baris ${i + 2}: ${(e as Error).message}`);
    }
  });
}

/** Peringkat gabungan per konfigurasi dari kolom peringkat_per_konfigurasi (tanpa menjalankan ulang pencarian). */
export function peringkatDariCsv(baris: Record<string, string>[], konfigurasi: string[]): PeringkatKonfigurasi {
  const hasil: PeringkatKonfigurasi = {};
  for (const konf of konfigurasi) {
    const perSub: Record<string, { id: string; g: number }[]> = {};
    for (const b of baris) {
      const p = JSON.parse(b.peringkat_per_konfigurasi || '{}') as Record<string, { g?: number | null }>;
      const g = p[konf]?.g;
      if (g === null || g === undefined) continue;
      const kunci = kunciSubBagian(b);
      (perSub[kunci] ??= []).push({ id: b.potongan_id, g });
    }
    // posisi = peringkat g asli (indeks g-1); potongan di luar pool meninggalkan lubang supaya k teratas tetap "g <= k"
    hasil[konf] = Object.fromEntries(Object.entries(perSub).map(([k, d]) => {
      const urutan: string[] = [];
      for (const x of d) urutan[x.g - 1] = x.id;
      return [k, urutan];
    }));
  }
  return hasil;
}

/** CSV ringkasan: satu baris per konfigurasi per sub-bagian, ditambah baris rata-rata. */
export function ringkasanCsvBaris(h: HasilRetrieval): { kepala: string[]; baris: unknown[][] } {
  const kepala = ['konfigurasi', 'sub_bagian', 'jumlah_relevan', ...h.kolomK.flatMap((k) => [`precision@${k}`, `recall@${k}`])];
  const f = (x: number | null) => (x === null ? '' : x.toFixed(4));
  const baris: unknown[][] = h.perSubBagian.map((s) => [s.konfigurasi, s.subBagian, s.jumlahRelevan, ...h.kolomK.flatMap((k) => [f(s.precision[k]), f(s.recall[k])])]);
  for (const [konf, perK] of Object.entries(h.rata)) {
    baris.push([konf, '(rata-rata)', '', ...h.kolomK.flatMap((k) => [f(perK[k].precision), f(perK[k].recall)])]);
  }
  return { kepala, baris };
}
