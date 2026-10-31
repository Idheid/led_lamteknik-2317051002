import type { HasilButirAngka } from './metrik-lkps.ts';

/**
 * Nilai butir angka (revisi 19 Okt 2026, keputusan 3):
 * - butir dengan rumus lama (kodeRumus) dihitung dari LKPS;
 * - butir tanpa rumus memakai nilai hitung yang diisi PJ (NilaiManual) sebagai sumber narasi;
 * - bila LKPS ada tetapi rumus tidak bisa membacanya (template LKPS berubah, tabel tidak lengkap),
 *   butir otomatis beralih ke nilai manual.
 */

export type SumberNilai = 'rumus' | 'manual' | 'belum';

export interface NilaiManualButir {
  nilai: string;
  keterangan: string | null;
}

export interface NilaiButir {
  butir: string;
  kodeRumus: string | null;
  sumber: SumberNilai;
  /** hasil rumus (juga bila tidak lengkap, untuk ditampilkan); butir = kode butir instrumen */
  hasil: HasilButirAngka | null;
  manual: NilaiManualButir | null;
  /** true bila PJ perlu/boleh mengisi nilai manual */
  perluManual: boolean;
  alasan: string | null;
}

export interface ButirAngka {
  kode: string;
  jenis: string;
  kodeRumus: string | null;
}

export function nilaiButirAngka(m: {
  butir: ButirAngka[];
  adaLkps: boolean;
  hitung: (kodeRumus: string) => HasilButirAngka | null;
  manual: Map<string, NilaiManualButir>;
}): NilaiButir[] {
  return m.butir.filter((b) => b.jenis === 'angka').map((b) => {
    const manual = m.manual.get(b.kode) ?? null;
    const isiManual = manual && manual.nilai.trim() ? manual : null;
    const mentah = b.kodeRumus && m.adaLkps ? m.hitung(b.kodeRumus) : null;
    const hasil = mentah ? { ...mentah, butir: b.kode } : null;
    if (b.kodeRumus && hasil?.lengkap) {
      return { butir: b.kode, kodeRumus: b.kodeRumus, sumber: 'rumus', hasil, manual: isiManual, perluManual: false, alasan: null };
    }
    let alasan: string;
    let perluManual = true;
    if (!b.kodeRumus) alasan = 'Butir ini tidak punya rumus di sistem: isi nilai hasil hitung Anda sendiri.';
    else if (!m.adaLkps) {
      alasan = 'Nilai dihitung otomatis setelah LKPS diunggah.';
      perluManual = Boolean(isiManual);
    } else {
      alasan = `Rumus tidak bisa membaca LKPS${hasil?.tabel.length ? ` (Tabel ${hasil.tabel.join(', ')} kosong atau formatnya berubah)` : ''}: isi nilai hasil hitung Anda sendiri.`;
    }
    return { butir: b.kode, kodeRumus: b.kodeRumus, sumber: isiManual ? 'manual' : 'belum', hasil, manual: isiManual, perluManual, alasan };
  });
}

/** Kode sumber nilai manual di prompt, mis. "M-NILAI-6-I". */
export function kodeSumberManual(butir: string): string {
  return `M-NILAI-${butir.replace(/[^\w-]/g, '')}`;
}
