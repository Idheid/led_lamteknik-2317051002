/**
 * "Bahan dari prodi (untuk AI)" (perbaikan 1 Nov 2026, P3; dulu "Jawaban penyusun"). Isian ini bahan AI saat menyusun
 * narasi (sumber J di prompt) dan tidak ikut diekspor; yang diekspor adalah Narasi.
 */

export const LABEL_BAHAN_PRODI = 'Bahan dari prodi';

const CONTOH_KRITERIA: Record<string, string> = {
  'C.1': 'Contoh: VMTS ditetapkan dengan SK Dekan No. ... tanggal ...; disosialisasikan lewat ... (rapat, laman, spanduk); ditinjau setiap ... tahun bersama ...',
  'C.2': 'Contoh: struktur organisasi ditetapkan dengan SK Rektor No. ... tanggal ...; laporan kinerja disampaikan setiap ... kepada ...',
  'C.3': 'Contoh: kurikulum ditinjau tahun ... dengan masukan ...; penelitian dan PkM dosen tahun TS: ... judul, dana Rp ... dari ...',
  'C.4': 'Contoh: ... dosen tetap, ... bergelar doktor; ... dosen mengikuti pelatihan ... tahun ...; rencana rekrutmen ... orang tahun ...',
  'C.5': 'Contoh: laboratorium ... dengan ... unit alat; SOP K3L ditetapkan dengan SK No. ... tanggal ...; perawatan alat setiap ...',
  'C.6': 'Contoh: seleksi mahasiswa baru lewat jalur ...; prestasi mahasiswa tahun TS: ... (nama lomba, tingkat); layanan konseling ...',
  'C.7': 'Contoh: audit mutu internal dilaksanakan tanggal ... oleh ...; temuan ... ditindaklanjuti dengan ...; RTM tanggal ...',
};

/** Contoh isian per sub-bagian (placeholder), dari kode kriteria atau bab. */
export function contohBahanProdi(subBagianKode: string): string {
  const kriteria = /^(C\.\d+)-/.exec(subBagianKode)?.[1];
  if (/-(AF)$/.test(subBagianKode)) return 'Contoh: faktor pendukung ...; faktor penghambat ...; data pendukung ... (angka, dokumen, kegiatan).';
  if (/-(SWOT)$/.test(subBagianKode)) return 'Contoh: kekuatan ...; kelemahan ...; peluang ...; ancaman ...; strategi yang sudah atau akan dilakukan ...';
  if (kriteria && CONTOH_KRITERIA[kriteria]) return CONTOH_KRITERIA[kriteria];
  if (subBagianKode.startsWith('AWAL-PENGANTAR')) return 'Contoh: ucapan terima kasih kepada ...; harapan prodi terhadap hasil akreditasi ...';
  if (subBagianKode.startsWith('III-')) return 'Contoh: program pengembangan tahun ... sampai ...: ...; target ...; sumber dana ...';
  return 'Contoh: fakta yang belum ada di dokumen: kegiatan, nomor dan tanggal SK, angka, rencana.';
}

/** Kode sumber di bawah paragraf: "J" ditampilkan "J = Bahan dari prodi". */
export function labelKodeSumber(sumber: string): string {
  return sumber.split(/,\s*/).map((k) => (k.trim() === 'J' ? `J = ${LABEL_BAHAN_PRODI}` : k.trim())).join(', ');
}
