import { dariSarjana, skorAmbang, type RumusJenjang } from './bersama.ts';
import { dosenIndustri, produkDiadopsi, publikasiPagelaran, sertifikasiDtps } from './vokasi.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Sarjana Terapan (STr), dari Matriks Penilaian LED dan LKPS Sarjana
 * Terapan 2025 (docs/rumus/RUMUS-STR.md). Tabel 6.d, 6.f.1, 6.h.1, 3.a.4 Sarjana Terapan berkolom sama dengan Sarjana,
 * jadi metrik Sarjana dipakai langsung. Butir 17 dan 31 berdeskriptor kualitatif (bukan butir angka).
 */

const J = 'STr';

export const RUMUS_STR: RumusJenjang[] = [
  // hlm. 5–7: kerja sama (faktor 2, 6, 8) dan dana BOP/DPD/DPkMD sama dengan Sarjana
  dariSarjana(J, '6-I', '6-I'),
  dariSarjana(J, '6-II', '6-II'),
  dariSarjana(J, '9', '9'),
  dariSarjana(J, '10', '10'),
  dariSarjana(J, '11', '11'),
  // hlm. 13: 50% ≤ PJP ≤ 70% → 4; < 50% → 1 + 6 × PJP; > 70% → 4 − (40 × PJP − 28) / 3
  dariSarjana(J, '18', '18', (v) => {
    const p = v.PJP;
    if (p === null) return { skor: null };
    return { skor: p < 0.5 ? 1 + 6 * p : p > 0.7 ? 4 - (40 * p - 28) / 3 : 4 };
  }),
  // hlm. 13: basic sciences dan matematika ≥ 4 sks → 4; 3 → 3; 2 → 2; < 2 → 1
  dariSarjana(J, '19', '19', (v) => {
    const s = v.SKS_BASIC;
    return { skor: s === null ? null : s >= 4 ? 4 : s >= 3 ? 3 : s >= 2 ? 2 : 1 };
  }),
  // hlm. 15–16: PPDMhs dan PKDMhs ≥ 25% → 4; < 25% → 2 + 8 × P
  dariSarjana(J, '23', '23', (v) => ({ skor: skorAmbang(v.PPDMhs, 0.25, (p) => 2 + 8 * p, 2) })),
  dariSarjana(J, '25', '25', (v) => ({ skor: skorAmbang(v.PKDMhs, 0.25, (p) => 2 + 8 * p, 2) })),
  // hlm. 17: seperti Sarjana (NDTPS ≥ 12, A = (NDTPS − 5)/7), tetapi NDTPS ≥ 5 dan PDTT > 40% → skor 2
  dariSarjana(J, '26', '26', (v) => {
    const n = v.NDTPS ?? 0;
    const p = v.PDTT;
    if (p === null) return { skor: null };
    const A = (n - 5) / 7;
    const B = p <= 0.1 ? (0.4 - p) / 0.4 : (0.4 - p) / 0.3;
    if (n >= 12 && p <= 0.1) return { skor: 4 };
    if (n >= 12 && p <= 0.4) return { skor: 2 + 2 * B };
    if (n >= 5 && p <= 0.4) return { skor: 2 + 2 * (A * B) };
    return { skor: n >= 5 ? 2 : 0 };
  }),
  // hlm. 17: PDS3 ≥ 20% → 4 (2 + 10 × PDS3); PGBLKL ≥ 50% → 4 (2 + 4 × PGBLKL)
  dariSarjana(J, '27', '27', (v) => ({ skor: skorAmbang(v.PDS3, 0.2, (p) => 2 + 10 * p, 2) })),
  dariSarjana(J, '28', '28', (v) => ({ skor: skorAmbang(v.PGBLKL, 0.5, (p) => 2 + 4 * p, 2) })),
  // hlm. 18: sertifikasi DTPS (PDSK ≥ 50% → 4; 1 + 6 × PDSK) dan dosen industri (PMKI ≥ 20% → 4; 2 + 10 × PMKI)
  sertifikasiDtps(J, '29', (p) => skorAmbang(p, 0.5, (x) => 1 + 6 * x, 1)),
  dosenIndustri(J, '30', (p) => skorAmbang(p, 0.2, (x) => 2 + 10 * x, 2)),
  // hlm. 19–20: RBK, penelitian, PkM sama dengan Sarjana
  dariSarjana(J, '32', '30'),
  dariSarjana(J, '33', '31'),
  dariSarjana(J, '34', '32'),
  // hlm. 20–21: Tabel 4.e, faktor a = 0,5; b = 0,5; c = 1
  publikasiPagelaran(J, '35', { sheet: '4e', penyebut: 'NDTPS', a: 0.5, b: 0.5, c: 1, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah DTPS' }),
  // hlm. 21–22: RLP sama dengan Sarjana
  dariSarjana(J, '36', '34'),
  // hlm. 22: PKDTPS ≥ 10% → 4; < 10% → 1 + 3 × PKDTPS(%) / 10 (PKDTPS dalam persen)
  dariSarjana(J, '38', '35', (v) => ({
    skor: skorAmbang(v.PKDTPS, 0.1, (p) => 1 + (3 * p * 100) / 10, 1),
    catatan: ['PKDTPS dalam rumus skor ditulis dalam persen (10% → skor 4).'],
  }), { judul: 'DTPS penulis pertama/korespondensi karya bereputasi' }),
  // hlm. 22–23: PKIB ≥ 15% → 4; < 15% → 2 + 40 × PKIB / 3
  dariSarjana(J, '39', '36', (v) => ({ skor: skorAmbang(v.PKIB, 0.15, (p) => 2 + (40 * p) / 3, 2) })),
  // hlm. 23: rekognisi sama dengan Sarjana (PRDTPS ≥ 50%)
  dariSarjana(J, '40', '37'),
  // hlm. 23: produk/jasa DTPS diadopsi (Tabel 4.g): NAPJ ≥ 3 → 4; < 3 → 1 + NAPJ
  produkDiadopsi(J, '37', { sheet: '4g', perDtps: false, skor: (n) => skorAmbang(n, 3, (x) => 1 + x, 1) }),
  // hlm. 25: 15 ≤ RMD ≤ 25 → 4; < 15 → 4 × RMD / 15; 25 < RMD < 35 → (70 − 2 × RMD) / 5; ≥ 35 → 0
  dariSarjana(J, '43', '40', (v) => {
    const r = v.RMD;
    if (r === null) return { skor: null };
    return { skor: r >= 35 ? 0 : r > 25 ? (70 - 2 * r) / 5 : r >= 15 ? 4 : (4 * r) / 15 };
  }),
  // hlm. 25–27: mahasiswa asing, IPK, prestasi (faktor 0,2%/2%/4%) sama dengan Sarjana
  dariSarjana(J, '44', '41'),
  dariSarjana(J, '45', '42'),
  dariSarjana(J, '46-I', '43-I'),
  dariSarjana(J, '46-II', '43-II'),
  // hlm. 27: produk/jasa mahasiswa diadopsi (Tabel 6.e.4): NAPJ ≥ 3 → 4; < 3 → 1 + NAPJ
  produkDiadopsi(J, '47', { sheet: '6e4', perDtps: false, skor: (n) => skorAmbang(n, 3, (x) => 1 + x, 1) }),
  // hlm. 27: masa studi sama dengan Sarjana
  dariSarjana(J, '48', '44'),
  // hlm. 27–28: PTW ≥ 80% → 4; < 80% → 1 + 30 × PTW / 8
  dariSarjana(J, '49', '45', (v) => ({ skor: skorAmbang(v.PTW, 0.8, (p) => 1 + (30 * p) / 8, 1) })),
  // hlm. 28: publikasi + pagelaran mahasiswa (Tabel 6.e.2), faktor a = 1%; b = 10%; c = 50%
  publikasiPagelaran(J, '50', { sheet: '6e2', penyebut: 'NM', a: 0.01, b: 0.1, c: 0.5, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah mahasiswa' }),
  // hlm. 29–31: luaran mahasiswa, waktu tunggu, kesesuaian bidang kerja, tempat kerja, kepuasan pengguna sama dengan Sarjana
  dariSarjana(J, '51', '47'),
  dariSarjana(J, '53', '49'),
  dariSarjana(J, '54', '50'),
  dariSarjana(J, '55', '51'),
  dariSarjana(J, '56', '52'),
];

export const MANUAL_STR: Record<string, string> = {};
