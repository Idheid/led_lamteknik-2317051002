import type { DokTiptap } from './narasi.ts';

/**
 * Rujukan sumber di Word (revisi 22 Okt 2026). Kode sumber per paragraf (D1, U1, T-4a, M-…, J) diganti rujukan singkat
 * di akhir paragraf, dan Lampiran berisi Daftar Rujukan dokumen yang dirujuk narasi:
 *   D/U → (Judul dokumen, tahun) · T → (LKPS Tabel 4.a) · M → (LKPS Tabel …, diolah)
 *   nilai manual → (LKPS, dihitung tim penyusun) · J, tim, jadwal → (Tim Penyusun LED)
 * Beberapa sumber dalam satu paragraf dipisah titik koma. Tahun kosong ditulis "t.t." (tanpa tahun).
 */

export interface DokumenRujukan {
  id: string;
  judul: string | null;
  namaBerkas: string;
  tahunTerbit: number | null;
  tautanBukti: string | null;
  /** true = dokumen bersama fakultas */
  bersama: boolean;
}

export interface KonteksRujukan {
  legenda: Record<string, string>;
  dokumen: DokumenRujukan[];
  /** kode metrik (M-NDTPS) → kode tabel LKPS sumbernya */
  tabelMetrik: Map<string, string[]>;
}

/** Kode sumber satu paragraf dari atribut `sumber` ("D1, T-4a"). */
export function kodeParagraf(attrs: Record<string, unknown> | undefined): string[] {
  const s = typeof attrs?.sumber === 'string' ? attrs.sumber : '';
  return s.split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean);
}

export function namaDokumen(d: Pick<DokumenRujukan, 'judul' | 'namaBerkas'>): string {
  return (d.judul?.trim() || d.namaBerkas.replace(/\.[a-z0-9]{2,5}$/i, '')).trim();
}

/** Judul dokumen dari teks legenda "Dokumen: Renstra FT 2021, hlm. 3" / "Bahan bersama …: …". */
export function judulDariLegenda(teks: string | undefined): { judul: string; bersama: boolean } | null {
  const m = /^(Dokumen|Bahan bersama[^:]*):\s*(.+?)(?:,\s*hlm\.\s*\d+)?$/.exec(teks?.trim() ?? '');
  return m ? { judul: m[2].trim(), bersama: m[1] !== 'Dokumen' } : null;
}

const kunci = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Dokumen yang dimaksud kode D/U sebuah versi draf (dicocokkan lewat judul atau nama berkas di legenda). */
export function dokumenUntukKode(kode: string, k: Pick<KonteksRujukan, 'legenda' | 'dokumen'>): DokumenRujukan | null {
  const j = judulDariLegenda(k.legenda[kode]);
  if (!j) return null;
  const cocok = k.dokumen.filter((d) => kunci(d.judul ?? '') === kunci(j.judul) || kunci(d.namaBerkas) === kunci(j.judul));
  return cocok.find((d) => d.bersama === j.bersama) ?? cocok[0] ?? null;
}

/** Satu bagian rujukan untuk satu kode sumber; null bila kode tidak dikenali. */
export function rujukanKode(kode: string, k: KonteksRujukan): string | null {
  if (/^[DU]\d+$/.test(kode)) {
    const d = dokumenUntukKode(kode, k);
    const j = judulDariLegenda(k.legenda[kode]);
    const judul = d ? namaDokumen(d) : j?.judul;
    return judul ? `${judul}, ${d?.tahunTerbit ?? 't.t.'}` : null;
  }
  if (kode.startsWith('T-')) {
    const m = /^LKPS Tabel (\S+)/.exec(k.legenda[kode] ?? '');
    return `LKPS Tabel ${m ? m[1] : kode.slice(2)}`;
  }
  if (kode.startsWith('M-NILAI-')) return 'LKPS, dihitung tim penyusun';
  if (kode === 'M-TIM' || kode === 'M-JADWAL' || kode === 'J') return 'Tim Penyusun LED';
  if (kode.startsWith('M-')) {
    const t = k.tabelMetrik.get(kode) ?? [];
    return t.length ? `LKPS Tabel ${t.join(', ')}, diolah` : 'LKPS, diolah';
  }
  return null;
}

/** Rujukan singkat akhir paragraf: "(LKPS Tabel 4.a; Renstra FT Unila 2021–2025, 2021)"; null bila tanpa sumber. */
export function rujukanSingkat(kode: string[], k: KonteksRujukan): string | null {
  const bagian = [...new Set(kode.map((x) => rujukanKode(x, k)).filter((x): x is string => Boolean(x)))];
  return bagian.length ? `(${bagian.join('; ')})` : null;
}

/**
 * Dokumen yang dirujuk narasi aktif (kode D/U di paragraf), urut menurut kemunculan pertama. Dipakai untuk Daftar
 * Rujukan di Lampiran dan pemeriksaan tautan bukti sebelum ekspor final.
 */
export function dokumenDirujuk(versi: { isi: DokTiptap; legenda: Record<string, string> }[], dokumen: DokumenRujukan[]): DokumenRujukan[] {
  const hasil = new Map<string, DokumenRujukan>();
  const jalan = (n: { type?: string; attrs?: Record<string, unknown>; content?: unknown[] }, legenda: Record<string, string>) => {
    if (n.type === 'paragraph') {
      for (const kode of kodeParagraf(n.attrs)) {
        if (!/^[DU]\d+$/.test(kode)) continue;
        const d = dokumenUntukKode(kode, { legenda, dokumen });
        if (d && !hasil.has(d.id)) hasil.set(d.id, d);
      }
    }
    for (const c of (n.content ?? []) as typeof n[]) jalan(c, legenda);
  };
  for (const v of versi) jalan(v.isi as unknown as Parameters<typeof jalan>[0], v.legenda);
  return [...hasil.values()];
}
