import { GalatAkses, type Pengguna } from "../../bersama/akses.ts";
import type { Peran } from "../../bersama/peran.ts";

/**
 * Hak akses modul LKPS (Gabung LKPS G4). Pengganti matriks `src/lib/permissions.ts` kode asal
 * (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff) yang dipetakan ke peran LED (lihat docs/GABUNG-LKPS-PETA.md bagian 4):
 *
 * | Area | Baca | Tulis |
 * |---|---|---|
 * | `kriteria` (isian kriteria 1–9, termasuk impor dan bukti) | ADMIN, TIM_PRODI (prodinya), ASESOR | TIM_PRODI (prodinya) |
 * | `identitas` (identitas dan tim penyusun LKPS) | ADMIN, TIM_PRODI (prodinya), ASESOR | ADMIN, TIM_PRODI (prodinya) |
 * | `konfigurasi` (regulasi, kriteria, tabel; seluruh fakultas) | ADMIN, TIM_PRODI, ASESOR | ADMIN |
 * | `ekspor` | ADMIN, TIM_PRODI (prodinya), ASESOR | – |
 *
 * TAMU tidak punya akses apa pun ke modul LKPS. Asesor hanya membaca LKPS prodi yang LED-nya ditugaskan kepadanya
 * (keputusan Adrianne di ⏸ G4, 18 Nov 2026; rancangan Ghalib: semua prodi). Pemeriksaan penugasan butuh basis data,
 * jadi dilakukan di src/modules/lkps/data/akses.ts; fungsi di berkas ini hanya memeriksa peran dan prodi milik.
 */

export type AreaLkps = "kriteria" | "identitas" | "konfigurasi" | "ekspor";

const PEMBACA: readonly Peran[] = ["ADMIN", "TIM_PRODI", "ASESOR"];

const PENULIS: Record<AreaLkps, readonly Peran[]> = {
  kriteria: ["TIM_PRODI"],
  identitas: ["ADMIN", "TIM_PRODI"],
  konfigurasi: ["ADMIN"],
  ekspor: [],
};

export const PESAN_PRODI_LAIN = "Data LKPS ini milik program studi lain.";

/** Peran yang boleh membuka modul LKPS (halaman dan API). */
export function bolehBukaLkps(peran: Peran): boolean {
  return PEMBACA.includes(peran);
}

export function bolehBacaLkps(peran: Peran, _area: AreaLkps): boolean {
  return PEMBACA.includes(peran);
}

export function bolehTulisLkps(peran: Peran, area: AreaLkps): boolean {
  return PENULIS[area].includes(peran);
}

export function bolehEksporLkps(peran: Peran): boolean {
  return PEMBACA.includes(peran);
}

/** Tim Prodi hanya memakai data prodinya sendiri; Admin dan Asesor boleh prodi mana pun (dipilih di pemilih prodi). */
function pastikanProdiMilik(p: Pengguna, prodiId: string | null): void {
  if (p.peran === "TIM_PRODI" && (!p.prodiId || p.prodiId !== prodiId)) throw new GalatAkses(PESAN_PRODI_LAIN);
}

export function pastikanBukaLkps(p: Pengguna): void {
  if (!bolehBukaLkps(p.peran)) throw new GalatAkses();
}

/** Baca data LKPS satu prodi (area `konfigurasi` boleh tanpa prodi: berlaku seluruh fakultas). */
export function pastikanBacaLkps(p: Pengguna, area: AreaLkps, prodiId: string | null): void {
  if (!bolehBacaLkps(p.peran, area)) throw new GalatAkses();
  if (area !== "konfigurasi") pastikanProdiMilik(p, prodiId);
}

export function pastikanTulisLkps(p: Pengguna, area: AreaLkps, prodiId: string | null): void {
  if (!bolehTulisLkps(p.peran, area)) throw new GalatAkses();
  if (area !== "konfigurasi") pastikanProdiMilik(p, prodiId);
}

export function pastikanEksporLkps(p: Pengguna, prodiId: string): void {
  if (!bolehEksporLkps(p.peran)) throw new GalatAkses();
  pastikanProdiMilik(p, prodiId);
}

/** Bukti diunggah oleh penulis isian kriteria (Tim Prodi) atau penulis identitas (tanda tangan tim penyusun). */
export function pastikanUnggahBukti(p: Pengguna, prodiId: string): void {
  if (!bolehTulisLkps(p.peran, "kriteria") && !bolehTulisLkps(p.peran, "identitas")) throw new GalatAkses();
  pastikanProdiMilik(p, prodiId);
}

/**
 * Jenis program untuk identitas LKPS (keputusan G0 no. 4): diturunkan dari jenjang, tidak disimpan. Pilihan kode asal
 * hanya Akademik/Vokasi; D1–D3, STr, S2Tr, S3Tr = Vokasi, selainnya (termasuk PPI) Akademik.
 */
export function jenisProgramDariJenjang(jenjang: string): "Vokasi" | "Akademik" {
  return ["D1", "D2", "D3", "STr", "S2Tr", "S3Tr"].includes(jenjang) ? "Vokasi" : "Akademik";
}
