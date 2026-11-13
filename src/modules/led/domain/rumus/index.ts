import { BUTIR_ANGKA_SARJANA, hitungButir, katalogRumus, type HasilButirAngka, type KonteksMetrik, type RumusKatalog, type TabelMetrik } from '../metrik-lkps.ts';
import type { RumusJenjang } from './bersama.ts';
import { MANUAL_D3, RUMUS_D3 } from './d3.ts';
import { MANUAL_STR, RUMUS_STR } from './str.ts';
import { MANUAL_S2, RUMUS_S2 } from './s2.ts';
import { MANUAL_PPI, RUMUS_PPI } from './ppi.ts';

/**
 * Rencana 10 Nov T10: semua rumus butir angka. Kode Sarjana (mis. "26") tetap; kode jenjang lain berawalan jenjang
 * (mis. "D3-23"). Dipakai nilai butir LED (lewat `ButirPenilaian.kodeRumus`), katalog ekstraksi instrumen, dan seed.
 */
export const RUMUS_JENJANG: Record<string, RumusJenjang[]> = { D3: RUMUS_D3, STr: RUMUS_STR, S2: RUMUS_S2, PPI: RUMUS_PPI };

/** Butir angka yang sengaja tetap manual, dengan alasan (data tidak ada di LKPS). */
export const MANUAL_JENJANG: Record<string, Record<string, string>> = { D3: MANUAL_D3, STr: MANUAL_STR, S2: MANUAL_S2, PPI: MANUAL_PPI };

/** Alasan butir angka belum punya rumus otomatis (ditampilkan di halaman cek instrumen dan Data LKPS). */
export function alasanTanpaRumus(jenjang: string, butir: string): string {
  return MANUAL_JENJANG[jenjang]?.[butir]
    ?? (RUMUS_JENJANG[jenjang] || jenjang === 'S1'
      ? 'tidak ada padanan rumus di katalog jenjang ini; isi nilai manual'
      : 'rumus otomatis jenjang ini belum dibuat (Rencana 10 Nov T10); isi nilai manual');
}

const PETA = new Map(Object.values(RUMUS_JENJANG).flat().map((r) => [r.kode, r]));

export function hitungRumus(kodeRumus: string, tabel: TabelMetrik[], k: KonteksMetrik): HasilButirAngka | null {
  const r = PETA.get(kodeRumus);
  if (!r) return hitungButir(kodeRumus, tabel, k);
  return r.hitung(new Map(tabel.map((x) => [x.sheet, x])), k);
}

export function rumusAda(kodeRumus: string): boolean {
  return PETA.has(kodeRumus) || BUTIR_ANGKA_SARJANA.includes(kodeRumus);
}

/** Katalog rumus satu jenjang (S1 = katalog Sarjana); jenjang tanpa rumus khusus memakai katalog Sarjana. */
export function katalogRumusJenjang(jenjang: string): RumusKatalog[] {
  const daftar = RUMUS_JENJANG[jenjang];
  if (!daftar) return katalogRumus();
  return daftar.map((r) => {
    const h = r.hitung(new Map(), { tsTahunMulai: 2025 });
    const utama = h.metrik.find((x) => x.kode === h.utama);
    return { kode: r.kode, judul: h.judul, tabel: h.tabel, rumus: utama?.rumus ?? (utama ? `${utama.kode}: ${utama.nama}` : null) };
  });
}

/** Butir jenjang → kode rumus (untuk seed dan pengecekan instrumen). */
export function kodeRumusButir(jenjang: string): Map<string, string> {
  if (jenjang === 'S1') return new Map(BUTIR_ANGKA_SARJANA.map((k) => [k, k]));
  return new Map((RUMUS_JENJANG[jenjang] ?? []).map((r) => [r.butir, r.kode]));
}
