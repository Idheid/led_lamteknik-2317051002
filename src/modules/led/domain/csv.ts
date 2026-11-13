/**
 * CSV sederhana (RFC 4180) untuk data uji pencarian: pemisah koma, sel berisi koma/kutip/baris baru diapit tanda kutip,
 * tanda kutip di dalam sel digandakan. Spreadsheet (Excel, LibreOffice) membuka hasilnya langsung.
 */

export function selCsv(nilai: unknown): string {
  const s = nilai === null || nilai === undefined ? '' : String(nilai);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tulisCsv(kepala: string[], baris: unknown[][]): string {
  return [kepala, ...baris].map((b) => b.map(selCsv).join(',')).join('\r\n') + '\r\n';
}

/** Baca CSV menjadi baris sel. BOM di awal diabaikan; baris kosong dilewati. */
export function bacaCsv(teks: string): string[][] {
  const s = teks.replace(/^﻿/, '');
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = '';
  let dalamKutip = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalamKutip) {
      if (c === '"') {
        if (s[i + 1] === '"') { sel += '"'; i++; } else dalamKutip = false;
      } else sel += c;
      continue;
    }
    if (c === '"') dalamKutip = true;
    else if (c === ',') { baris.push(sel); sel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      baris.push(sel); sel = '';
      if (baris.some((x) => x !== '')) hasil.push(baris);
      baris = [];
    } else sel += c;
  }
  baris.push(sel);
  if (baris.some((x) => x !== '')) hasil.push(baris);
  return hasil;
}

/** CSV dengan baris kepala menjadi objek per baris. */
export function bacaCsvObjek(teks: string): Record<string, string>[] {
  const [kepala, ...isi] = bacaCsv(teks);
  if (!kepala) return [];
  return isi.map((b) => Object.fromEntries(kepala.map((k, i) => [k.trim(), b[i] ?? ''])));
}
