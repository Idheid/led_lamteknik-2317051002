/**
 * Penyusun prompt untuk generate satu sub-bagian LED (satu panggilan LLM = satu sub-bagian).
 * Fungsi murni: tidak memanggil LLM. Dipakai oleh worker generate (iterasi 3).
 *
 * Prinsip (dokumen rencana, "Mesin penyusun draf"):
 * - Hanya fakta yang ada di konteks. Angka dihitung sistem, bukan LLM.
 * - Unsur skor 4 tanpa bukti tidak ditulis seolah terpenuhi; ditandai [BELUM ADA BUKTI: ...].
 * - Setiap paragraf menyimpan kode sumbernya.
 */

export interface PotonganKonteks {
  /** Kode sumber yang akan dikutip LLM, misalnya "D12". */
  id: string;
  /** Nama berkas atau judul dokumen. */
  sumber: string;
  teks: string;
}

export interface MetrikKonteks {
  /** Kode sumber, misalnya "M-PDS3". */
  id: string;
  nama: string;
  nilaiTeks: string;
  keterangan?: string;
}

export interface TabelKonteks {
  /** Kode sumber, misalnya "T-4.a". */
  id: string;
  judul: string;
  /** Tabel ringkas dalam format Markdown, label TS sudah diganti tahun nyata. */
  markdown: string;
}

export interface ButirKonteks {
  kode: string;
  elemen: string;
  indikator: string;
  jenis: 'narasi' | 'angka';
  deskriptorSkor4: string;
  unsurSkor4: string[];
}

export interface KonteksSubBagian {
  prodi: { nama: string; jenjang: string; upps: string; perguruanTinggi: string };
  ts: { tahunAkademik: string; petaLabel: Record<string, string> };
  subBagian: { kode: string; label: string; judul: string; grup?: string | null; instruksi: string; tipe: string };
  kriteria?: { kode: string; nama: string } | null;
  butir: ButirKonteks[];
  jawabanForm?: string | null;
  metrik: MetrikKonteks[];
  tabel: TabelKonteks[];
  potongan: PotonganKonteks[];
  /** Untuk analisis faktor dan SWOT: ringkasan hasil IKU kriteria yang sama. */
  ringkasanIku?: string | null;
  targetKata: number;
}

export const PENANDA_BELUM_ADA_BUKTI = '[BELUM ADA BUKTI:';

export function susunSistem(): string {
  return [
    'Anda menyusun draf Laporan Evaluasi Diri (LED) akreditasi program studi untuk LAM Teknik.',
    'Aturan wajib:',
    '1. Pakai hanya fakta yang ada di KONTEKS. Jangan menambah angka, nama, tanggal, nomor SK, atau dokumen yang tidak tertulis di konteks.',
    '2. Angka hanya boleh disalin dari METRIK, TABEL LKPS, JAWABAN PENYUSUN, atau POTONGAN DOKUMEN. Jangan menghitung ulang.',
    `3. Bila unsur skor 4 tidak didukung bukti di konteks, jangan menulisnya seolah terpenuhi. Tulis penanda ${PENANDA_BELUM_ADA_BUKTI} <unsur>] di tempat yang relevan dan isi status unsur "belum_ada_bukti".`,
    '4. Setiap paragraf wajib mencantumkan kode sumber yang dipakai (misalnya D3, T-4.a, M-PDS3, J). Paragraf tanpa sumber tidak boleh ada.',
    '5. Bahasa Indonesia baku, kalimat aktif, lugas, tanpa promosi berlebihan. Satu paragraf 3 sampai 6 kalimat.',
    '6. Angka memakai format Indonesia (desimal koma, ribuan titik). Tahun akademik ditulis seperti 2025/2026, bukan TS.',
    '7. Istilah asing ditulis miring dengan tanda *istilah*. Jangan memakai huruf tebal atau judul; struktur dokumen diatur sistem.',
    '8. Arahkan narasi ke unsur deskriptor skor 4 secara jujur: tunjukkan bukti untuk unsur yang terpenuhi dan tindak lanjut untuk yang belum.',
    '9. Butir berjenis angka cukup 1 sampai 2 paragraf analisis (tren, penyebab, rencana); tabelnya disisipkan sistem.',
    '10. Keluarkan hanya JSON sesuai skema.',
  ].join('\n');
}

function blok(judul: string, isi: string | null | undefined): string {
  const t = (isi ?? '').trim();
  return t ? `## ${judul}\n${t}` : '';
}

export function susunPengguna(k: KonteksSubBagian): string {
  const peta = Object.entries(k.ts.petaLabel).map(([l, t]) => `${l} = ${t}`).join('; ');
  const butir = k.butir.map((b) => [
    `- Butir ${b.kode} (${b.jenis}) ${b.elemen}: ${b.indikator}`,
    `  Deskriptor skor 4: ${b.deskriptorSkor4}`,
    `  Unsur yang dicek: ${b.unsurSkor4.map((u, i) => `(${i + 1}) ${u}`).join('; ')}`,
  ].join('\n')).join('\n');
  const metrik = k.metrik.map((m) => `- [${m.id}] ${m.nama} = ${m.nilaiTeks}${m.keterangan ? ` (${m.keterangan})` : ''}`).join('\n');
  const tabel = k.tabel.map((t) => `[${t.id}] ${t.judul}\n${t.markdown}`).join('\n\n');
  const potongan = k.potongan.map((p) => `[${p.id}] (${p.sumber})\n${p.teks}`).join('\n\n');
  const lokasi = [k.kriteria ? `${k.kriteria.kode} ${k.kriteria.nama}` : null, k.subBagian.grup, `${k.subBagian.label} ${k.subBagian.judul}`.trim()]
    .filter(Boolean).join(' › ');
  return [
    blok('IDENTITAS', `Program studi: ${k.prodi.nama} (${k.prodi.jenjang}), UPPS: ${k.prodi.upps}, ${k.prodi.perguruanTinggi}.\nTS = ${k.ts.tahunAkademik}. Peta label: ${peta}.`),
    blok('SUB-BAGIAN YANG DITULIS', `${lokasi}\nInstruksi template: ${k.subBagian.instruksi}`),
    blok('BUTIR PENILAIAN TERKAIT', butir),
    blok('JAWABAN PENYUSUN [J]', k.jawabanForm),
    blok('METRIK DARI SISTEM', metrik),
    blok('TABEL LKPS', tabel),
    blok('POTONGAN DOKUMEN', potongan),
    blok('RINGKASAN INDIKATOR KINERJA KRITERIA INI', k.ringkasanIku),
    blok('PANJANG', `Sekitar ${k.targetKata} kata (boleh selisih 15%).`),
  ].filter(Boolean).join('\n\n');
}

/** Kode sumber yang sah untuk konteks ini (dipakai memeriksa keluaran). */
export function kodeSumberSah(k: KonteksSubBagian): Set<string> {
  const s = new Set<string>([...k.metrik.map((m) => m.id), ...k.tabel.map((t) => t.id), ...k.potongan.map((p) => p.id)]);
  if (k.jawabanForm && k.jawabanForm.trim()) s.add('J');
  return s;
}

/** Skema JSON keluaran (bisa dibungkus jsonSchema() di AI SDK atau diubah ke Zod). */
export const SKEMA_KELUARAN = {
  type: 'object',
  additionalProperties: false,
  required: ['paragraf', 'unsur', 'dokumenKurang'],
  properties: {
    paragraf: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['teks', 'sumber'],
        properties: {
          teks: { type: 'string' },
          sumber: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
      },
    },
    unsur: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['butir', 'unsur', 'status'],
        properties: {
          butir: { type: 'string' },
          unsur: { type: 'string' },
          status: { type: 'string', enum: ['terpenuhi', 'sebagian', 'belum_ada_bukti'] },
          sumber: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    dokumenKurang: { type: 'array', items: { type: 'string' } },
    catatanUntukPenyusun: { type: 'string' },
  },
} as const;

export interface KeluaranSubBagian {
  paragraf: { teks: string; sumber: string[] }[];
  unsur: { butir: string; unsur: string; status: 'terpenuhi' | 'sebagian' | 'belum_ada_bukti'; sumber?: string[] }[];
  dokumenKurang: string[];
  catatanUntukPenyusun?: string;
}

export interface MasalahKeluaran {
  jenis: 'tanpa_sumber' | 'sumber_tidak_dikenal' | 'unsur_hilang';
  pesan: string;
}

/** Periksa keluaran LLM terhadap konteks: sumber per paragraf dan kelengkapan status unsur. */
export function periksaKeluaran(k: KonteksSubBagian, out: KeluaranSubBagian): MasalahKeluaran[] {
  const sah = kodeSumberSah(k);
  const masalah: MasalahKeluaran[] = [];
  out.paragraf.forEach((p, i) => {
    if (!p.sumber || p.sumber.length === 0) masalah.push({ jenis: 'tanpa_sumber', pesan: `Paragraf ${i + 1} tidak punya sumber.` });
    for (const s of p.sumber ?? []) {
      if (!sah.has(s)) masalah.push({ jenis: 'sumber_tidak_dikenal', pesan: `Paragraf ${i + 1} mengutip sumber yang tidak ada di konteks: ${s}.` });
    }
  });
  for (const b of k.butir) {
    b.unsurSkor4.forEach((u, i) => {
      const ada = out.unsur.some((x) => x.butir === b.kode && (x.unsur === u || x.unsur.startsWith(`(${i + 1})`) || x.unsur.includes(u.slice(0, 20))));
      if (!ada) masalah.push({ jenis: 'unsur_hilang', pesan: `Status unsur (${i + 1}) butir ${b.kode} tidak dilaporkan.` });
    });
  }
  return masalah;
}
