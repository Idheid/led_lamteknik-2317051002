import { paragrafBersumber, type DokTiptap } from './narasi.ts';
import { ekstrakAngka, formatAngka } from '../../bersama/domain/teks.ts';
import { pecahKalimat } from './verifikasi.ts';

/**
 * Konsistensi angka antar kriteria (revisi 22 Okt 2026, saran 1; Pedoman: data "akurat, konsisten antara data satu
 * dengan lainnya"). Sebelum ekspor, semua kalimat di draf aktif yang merujuk metrik LKPS yang sama dibandingkan dengan
 * nilai metrik itu: angka di kalimat yang besarnya sebanding dengan nilai metrik dianggap klaim untuk metrik itu.
 * Perbedaan tampil sebagai daftar, misalnya "Jumlah DTPS (LKPS 12): C.4 menyebut 12; C.2 menyebut 11".
 */

export interface MetrikAcuan {
  kode: string;
  nama: string;
  /** dalam skala yang ditulis di narasi (persen 0–100) */
  nilai: number;
}

export interface DrafKonsistensi {
  subKode: string;
  label: string;
  bagianKode: string;
  doc: DokTiptap;
}

export interface TemuanAngka {
  subKode: string;
  label: string;
  bagianKode: string;
  angka: number;
  teks: string;
  kalimat: string;
  cocok: boolean;
}

export interface PerbedaanAngka {
  /** kunci alasan: metrik|sub|angka */
  kunci: string;
  metrik: string;
  nama: string;
  nilaiLkps: number;
  temuan: TemuanAngka;
  /** semua penyebutan metrik ini (yang sesuai juga), untuk konteks tampilan */
  lain: TemuanAngka[];
}

/** Metrik turunan yang tidak dibandingkan (capaian, tren, tim, jadwal). */
const LEWATI = /^M-(CAPAIAN|TREN|TIM|JADWAL)\b/;

function sebanding(a: number, v: number): boolean {
  if (v === 0) return a <= 1;
  const r = a / v;
  return r >= 0.5 && r <= 2;
}

function sama(a: number, v: number): boolean {
  return Math.abs(a - v) <= Math.max(0.01 * Math.abs(v), 0.051);
}

export function kunciPerbedaan(metrik: string, subKode: string, angka: number): string {
  return `${metrik}|${subKode}|${angka}`;
}

export function periksaKonsistensi(draf: DrafKonsistensi[], metrik: Map<string, MetrikAcuan>): PerbedaanAngka[] {
  const per = new Map<string, TemuanAngka[]>();
  for (const d of draf) {
    for (const p of paragrafBersumber(d.doc)) {
      const kode = p.sumber.filter((s) => s.startsWith('M-') && !LEWATI.test(s) && metrik.has(s));
      if (kode.length === 0) continue;
      for (const k of pecahKalimat(p.teks)) {
        const angka = ekstrakAngka(k).filter((a) => !(Number.isInteger(a.nilai) && a.nilai >= 1990 && a.nilai <= 2100));
        for (const m of kode) {
          const v = metrik.get(m)!.nilai;
          for (const a of angka) {
            // bilangan bulat kecil (penomoran) hanya dibandingkan bila nilai metriknya juga kecil
            if (Number.isInteger(a.nilai) && a.nilai <= 10 && v > 20) continue;
            if (!sebanding(a.nilai, v)) continue;
            const t: TemuanAngka = { subKode: d.subKode, label: d.label, bagianKode: d.bagianKode, angka: a.nilai, teks: a.teks.trim(), kalimat: k, cocok: sama(a.nilai, v) };
            per.set(m, [...(per.get(m) ?? []), t]);
          }
        }
      }
    }
  }
  const hasil: PerbedaanAngka[] = [];
  for (const [m, daftar] of per) {
    const acuan = metrik.get(m)!;
    for (const t of daftar.filter((x) => !x.cocok)) {
      hasil.push({ kunci: kunciPerbedaan(m, t.subKode, t.angka), metrik: m, nama: acuan.nama, nilaiLkps: acuan.nilai, temuan: t, lain: daftar });
    }
  }
  return hasil;
}

/** "Jumlah DTPS (LKPS 12): C.4-IKU-a.i menyebut 12; C.2-LB menyebut 11". */
export function teksPerbedaan(p: PerbedaanAngka): string {
  const disebut = [...new Map(p.lain.map((t) => [`${t.label}|${t.angka}`, t])).values()]
    .map((t) => `${t.label} menyebut ${formatAngka(t.angka, 2)}`).join('; ');
  return `${p.nama} (LKPS ${formatAngka(p.nilaiLkps, 2)}): ${disebut}`;
}
