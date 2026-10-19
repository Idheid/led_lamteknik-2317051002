import { romawi, type ButirBobot } from './bobot.ts';
import { teksBarisMatriks, type BarisMatriks } from './matriks.ts';
import { pecahUnsurSkor4 } from './navigasi.ts';

/**
 * Ekstraksi butir penilaian dari Matriks Penilaian (revisi 19 Okt 2026). Tabel matriks disusun ulang tanpa AI
 * (matriks.ts), bobot dibaca tanpa AI dari Pedoman Penilaian (bobot.ts); AI hanya memecah sub-indikator, merapikan
 * kolom, dan mengusulkan sub-bagian, jenis, dan rumus. Semua usulan AI ditandai sampai dicek PJ.
 */

/** Keluaran AI untuk satu butir/sub-indikator. */
export interface ButirAi {
  no: string;
  sub: string | null;
  elemen: string;
  indikator: string;
  skor4: string;
  skor3: string;
  skor2: string;
  skor1: string;
  skor0: string;
  tabelLkps: string[];
  jenis: 'narasi' | 'angka';
  kodeRumus: string | null;
  subBagian: string[];
}

export interface SubPilihan {
  kode: string;
  bagianKode: string;
  judul: string;
  grup: string | null;
}

export interface RumusPilihan {
  kode: string;
  judul: string;
  rumus: string | null;
}

/** Kolom yang ditandai sebagai usulan AI sampai dikonfirmasi PJ. */
export const KOLOM_USULAN = ['subBagian', 'jenis', 'kodeRumus'] as const;

export interface ButirDraf {
  kode: string;
  no: number;
  sub: string | null;
  urutan: number;
  bagianKode: string;
  elemen: string;
  indikator: string;
  bobot: number;
  jenis: 'narasi' | 'angka';
  tabelLkps: string[];
  deskriptorSkor4: string;
  deskriptorSkor3: string | null;
  deskriptorSkor2: string | null;
  deskriptorSkor1: string | null;
  deskriptorSkor0: string | null;
  unsurSkor4: string[];
  kodeRumus: string | null;
  subBagian: string[];
  usulanAi: string[];
  catatan: string | null;
}

/** Bagian (kriteria) yang mungkin untuk satu baris matriks, dari judul konteks "I. …" → C.1, "B. …" → II.B/III. */
export function bagianDariKonteks(konteks: string[], semuaBagian: string[]): string[] {
  const romawiKe = (r: string) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].indexOf(r) + 1;
  const r = [...konteks].reverse().map((k) => /^([IVX]+)\.\s/.exec(k)?.[1]).find(Boolean);
  const huruf = konteks.map((k) => /^([A-Z])\.\s+[^a-z]+$/.exec(k)?.[1]).find(Boolean);
  if (r && huruf !== 'B') {
    const kode = `C.${romawiKe(r)}`;
    if (semuaBagian.includes(kode)) return [kode];
  }
  const lain = semuaBagian.filter((b) => !/^C\.\d/.test(b) && b !== 'AWAL');
  return lain.length ? lain : semuaBagian;
}

export function promptEkstraksi(m: {
  jenjang: string;
  baris: BarisMatriks[];
  bobot: ButirBobot[];
  sub: SubPilihan[];
  rumus: RumusPilihan[];
}): { sistem: string; pengguna: string } {
  const semuaBagian = [...new Set(m.sub.map((s) => s.bagianKode))];
  const bagianDipakai = new Set(m.baris.flatMap((b) => bagianDariKonteks(b.konteks, semuaBagian)));
  const sub = m.sub.filter((s) => bagianDipakai.has(s.bagianKode));
  const nomor = new Set(m.baris.map((b) => Number(b.no)));
  const bobot = m.bobot.filter((b) => nomor.has(b.no));
  const sistem = [
    'Anda menyalin tabel Matriks Penilaian LED dan LKPS LAM Teknik menjadi data terstruktur. Teks diambil dari PDF dan sudah disusun per baris dan kolom.',
    'Aturan:',
    '1. Salin teks apa adanya dari baris tabel. Jangan meringkas, jangan menambah, jangan memperbaiki isi. Rapikan hanya spasi dan pemenggalan baris.',
    '2. Satu objek untuk setiap butir atau sub-indikator. Jumlah sub-indikator mengikuti TABEL BOBOT: bila nomor butir punya beberapa baris bobot, buat sub "I", "II", ... berurutan; bila satu, sub = null.',
    '3. Pada butir dengan beberapa sub-indikator, isi kolom skor biasanya bersambung untuk sub I lalu sub II: pisahkan bagian milik tiap sub. Bila tidak bisa dipisahkan, salin seluruh isi ke setiap sub.',
    '4. elemen = isi kolom Kriteria tanpa kalimat "Skor = …". indikator = isi kolom Indikator untuk sub itu, tanpa rujukan "Tabel … LKPS".',
    '5. tabelLkps = kode tabel LKPS yang disebut di baris itu ("Tabel 6.a. LKPS" → "6.a", "Tabel 3.a.1)" → "3.a.1").',
    '6. jenis = "angka" bila skor ditentukan rumus atau ambang angka (≥, ≤, %, rasio, "Skor = …"); selain itu "narasi".',
    '7. kodeRumus = kode dari KATALOG RUMUS bila makna rumus butir sama (variabel dan tabel sumber sama); null bila tidak ada yang cocok atau jenis narasi.',
    '8. subBagian = satu atau lebih kode dari DAFTAR SUB-BAGIAN yang paling sesuai dengan indikator (judul atau grup yang membahas hal yang sama). Jangan membuat kode baru.',
    '9. Kolom skor yang kosong ("-") ditulis "". Kalimat "Tidak ada skor kurang dari …" tetap disalin di kolom tempatnya.',
    '10. no ditulis sebagai teks angka ("14").',
  ].join('\n');
  const pengguna = [
    `Jenjang: ${m.jenjang}`,
    '',
    '## TABEL BOBOT (dari Pedoman Penilaian)',
    bobot.length
      ? bobot.map((b) => `- ${b.kode}: bobot ${b.bobot}; ${b.indikator.replace(/\s+/g, ' ').slice(0, 220)}`).join('\n')
      : '(tidak tersedia: tentukan sub-indikator dari kolom Indikator, mis. "I. …", "II. …")',
    '',
    '## DAFTAR SUB-BAGIAN TEMPLATE LED',
    sub.map((s) => `- ${s.kode} | ${s.grup ? `${s.grup} › ` : ''}${s.judul}`).join('\n'),
    '',
    '## KATALOG RUMUS',
    m.rumus.map((r) => `- ${r.kode} | ${r.judul}${r.rumus ? ` | ${r.rumus}` : ''}`).join('\n'),
    '',
    '## BARIS MATRIKS',
    m.baris.map(teksBarisMatriks).join('\n\n'),
  ].join('\n');
  return { sistem, pengguna };
}

function bagiBobot(total: number, n: number): number[] {
  const dasar = Math.floor((total / n) * 100) / 100;
  const hasil = Array.from({ length: n }, () => dasar);
  hasil[n - 1] = Math.round((total - dasar * (n - 1)) * 100) / 100;
  return hasil;
}

function kosong(s: string | null | undefined): string | null {
  const t = (s ?? '').trim();
  return t && t !== '-' ? t : null;
}

/**
 * Gabungkan keluaran AI dengan baris matriks dan tabel bobot menjadi draf butir. Jumlah sub-indikator mengikuti
 * tabel bobot; bila satu bobot dipakai beberapa sub-indikator, bobot dibagi rata dan ditandai untuk dicek.
 */
export function gabungButir(m: {
  baris: BarisMatriks[];
  ai: ButirAi[];
  bobot: ButirBobot[];
  sub: SubPilihan[];
  rumus: RumusPilihan[];
  urutanAwal?: number;
}): ButirDraf[] {
  const subSah = new Map(m.sub.map((s) => [s.kode, s]));
  const rumusSah = new Set(m.rumus.map((r) => r.kode));
  const semuaBagian = [...new Set(m.sub.map((s) => s.bagianKode))];
  const hasil: ButirDraf[] = [];
  let urutan = m.urutanAwal ?? 0;
  for (const b of m.baris) {
    const no = Number(b.no);
    const dariAi = m.ai.filter((x) => Number(x.no) === no);
    const bobot = m.bobot.filter((x) => x.no === no);
    const n = Math.max(bobot.length, dariAi.length, 1);
    const bobotTiap = bobot.length === n ? bobot.map((x) => x.bobot) : bobot.length === 1 ? bagiBobot(bobot[0].bobot, n) : Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const a = dariAi[i] ?? dariAi[dariAi.length - 1];
      const usulan = new Set<string>(KOLOM_USULAN);
      const catatan: string[] = [];
      if (!a) {
        usulan.add('elemen').add('indikator').add('deskriptor');
        catatan.push('AI tidak mengembalikan butir ini; kolom disalin dari tabel tanpa pemisahan sub-indikator.');
      } else if (dariAi.length !== n) {
        usulan.add('indikator').add('deskriptor');
        catatan.push(`Jumlah sub-indikator dari AI (${dariAi.length}) berbeda dengan tabel bobot (${bobot.length}).`);
      }
      if (bobot.length === 0) {
        usulan.add('bobot');
        catatan.push('Bobot tidak ditemukan di tabel bobot Pedoman Penilaian.');
      } else if (bobot.length !== n) {
        usulan.add('bobot');
        catatan.push(`Tabel bobot memberi ${bobot.length} bobot untuk ${n} sub-indikator; bobot dibagi rata.`);
      }
      const subKode = (a?.subBagian ?? []).filter((k) => subSah.has(k));
      if (subKode.length === 0) catatan.push('Sub-bagian belum dipilih.');
      const bagianKode = subKode.length ? subSah.get(subKode[0])!.bagianKode : bagianDariKonteks(b.konteks, semuaBagian)[0] ?? '';
      const skor4 = kosong(a?.skor4) ?? kosong(b.skor[0]) ?? '';
      const sub = n > 1 ? romawi(i + 1) : null;
      urutan += 1;
      hasil.push({
        kode: sub ? `${no}-${sub}` : String(no),
        no,
        sub,
        urutan,
        bagianKode,
        elemen: kosong(a?.elemen) ?? b.kriteria.replace(/\n?Skor\s*=.*$/s, '').trim(),
        indikator: kosong(a?.indikator) ?? kosong(bobot[i]?.indikator) ?? b.indikator,
        bobot: bobotTiap[i] ?? 0,
        jenis: a?.jenis === 'angka' ? 'angka' : 'narasi',
        tabelLkps: [...new Set((a?.tabelLkps ?? []).map((t) => t.trim()).filter(Boolean))],
        deskriptorSkor4: skor4,
        deskriptorSkor3: kosong(a ? a.skor3 : b.skor[1]),
        deskriptorSkor2: kosong(a ? a.skor2 : b.skor[2]),
        deskriptorSkor1: kosong(a ? a.skor1 : b.skor[3]),
        deskriptorSkor0: kosong(a ? a.skor0 : b.skor[4]),
        unsurSkor4: pecahUnsurSkor4(skor4),
        kodeRumus: a?.jenis === 'angka' && a.kodeRumus && rumusSah.has(a.kodeRumus) ? a.kodeRumus : null,
        subBagian: subKode,
        usulanAi: [...usulan],
        catatan: catatan.length ? catatan.join(' ') : null,
      });
    }
  }
  return hasil;
}

/** Draf butir tanpa AI (mode uji pengembangan): satu butir per baris tabel, sub-indikator dari tabel bobot. */
export function butirTanpaAi(baris: BarisMatriks[]): ButirAi[] {
  return baris.map((b) => ({
    no: b.no, sub: null, elemen: b.kriteria.replace(/\n?Skor\s*=.*$/s, '').trim(), indikator: b.indikator.replace(/\s*Tabel\s+[\d.a-z]+\.?\s*(LKPS)?\.?/gi, ' ').trim(),
    skor4: b.skor[0], skor3: b.skor[1], skor2: b.skor[2], skor1: b.skor[3], skor0: b.skor[4],
    tabelLkps: [...b.indikator.matchAll(/Tabel\s+(\d+(?:\.[a-z0-9]+)*)/gi)].map((x) => x[1].replace(/\.$/, '')),
    jenis: /[≥≤]|%|Skor\s*=|rasio/i.test(b.skor.join(' ')) ? 'angka' : 'narasi', kodeRumus: null, subBagian: [],
  }));
}

// ------------------------------------------------------------------ pemeriksaan otomatis

export interface ButirCek {
  kode: string;
  no: number;
  bobot: number;
  deskriptorSkor4: string;
  jumlahSub: number;
  dikonfirmasi: boolean;
}

export interface SubCek {
  kode: string;
  tipe: string;
  instruksi: string[];
}

export interface HasilCekInstrumen {
  /** menghalangi aktivasi */
  galat: string[];
  peringatan: string[];
  totalBobot: number;
  belumDikonfirmasi: number;
}

export function periksaInstrumen(butir: ButirCek[], sub: SubCek[]): HasilCekInstrumen {
  const galat: string[] = [];
  const peringatan: string[] = [];
  const total = Math.round(butir.reduce((n, b) => n + b.bobot, 0) * 100) / 100;
  if (butir.length === 0) galat.push('Belum ada butir penilaian.');
  if (butir.length && Math.abs(total - 100) > 0.0101) galat.push(`Total bobot ${total.toLocaleString('id-ID')}, seharusnya 100 (100,01 diterima karena pembulatan).`);
  const kodeGanda = butir.map((b) => b.kode).filter((k, i, a) => a.indexOf(k) !== i);
  if (kodeGanda.length) galat.push(`Kode butir ganda: ${[...new Set(kodeGanda)].join(', ')}.`);
  const nomor = [...new Set(butir.map((b) => b.no))].sort((a, b) => a - b);
  const hilang = nomor.length ? Array.from({ length: nomor[nomor.length - 1] }, (_, i) => i + 1).filter((n) => !nomor.includes(n)) : [];
  if (hilang.length) galat.push(`Nomor butir tidak berurutan; tidak ada nomor ${hilang.join(', ')}.`);
  const tanpaDeskriptor = butir.filter((b) => !b.deskriptorSkor4.trim()).map((b) => b.kode);
  if (tanpaDeskriptor.length) galat.push(`Butir tanpa deskriptor skor 4: ${tanpaDeskriptor.join(', ')}.`);
  const tanpaSub = butir.filter((b) => b.jumlahSub === 0).map((b) => b.kode);
  if (tanpaSub.length) galat.push(`Butir belum dikaitkan ke sub-bagian: ${tanpaSub.join(', ')}.`);
  const tanpaBobot = butir.filter((b) => !(b.bobot > 0)).map((b) => b.kode);
  if (tanpaBobot.length) peringatan.push(`Butir dengan bobot 0: ${tanpaBobot.join(', ')}.`);
  const tanpaInstruksi = sub.filter((s) => s.tipe !== 'data' && s.tipe !== 'otomatis' && !s.instruksi.some((i) => i.trim())).map((s) => s.kode);
  if (tanpaInstruksi.length) galat.push(`Sub-bagian tanpa instruksi: ${tanpaInstruksi.join(', ')}.`);
  const belum = butir.filter((b) => !b.dikonfirmasi).length;
  if (belum) galat.push(`${belum} butir belum dicek dan dikonfirmasi.`);
  return { galat, peringatan, totalBobot: total, belumDikonfirmasi: belum };
}
