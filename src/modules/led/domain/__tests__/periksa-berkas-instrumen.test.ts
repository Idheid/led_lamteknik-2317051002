import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cocokKriteria, jenisDocx, jenisPdf, jenjangDariMatriks, konfirmasiTertunda, kriteriaDariKonteks, kriteriaTemplateCadangan,
  periksaBerkasInstrumen, periksaTahunAktif, tahunDariTeks, tahunInstrumenSah, tambahRiwayat, teksKunciMatriks,
  type BacaanBerkas, type HasilPeriksa, type MasukanPeriksa, type SidikJariDikenal,
} from '../periksa-berkas-instrumen.ts';
import type { ParagrafTemplate } from '../template-led.ts';

const K2025 = [
  'Diferensiasi Misi (Visi, Misi, Tujuan, dan Strategi)', 'Akuntabilitas', 'Relevansi Pendidikan, Penelitian, dan PkM',
  'Sumber Daya Manusia', 'Sarana, Prasarana, dan Keselamatan Kesehatan Kerja dan Lingkungan (K3L)',
  'Mahasiswa dan Luaran Mahasiswa', 'Sistem Penjaminan Mutu',
];
const KLAMA = [
  'Visi, Misi, Tujuan, dan Strategi', 'Tata Pamong, Tata Kelola dan Kerja sama', 'Mahasiswa', 'Sumber Daya Manusia',
  'Keuangan, Sarana dan Prasarana', 'Pendidikan', 'Penelitian', 'Pengabdian kepada Masyarakat',
  'Luaran dan Capaian Tridharma Perguruan Tinggi',
];
const SHA_RESMI = '0a8caea91326748bea48dc6c1c97eda997e3cb4c0557defb2d3a2a7e0cf1a8f5';
const SHA_LAMA = '58e897fe095a647a09acd20316256f26bb964fd373a69ba6817f4c5d229f3a72';
const DIKENAL: SidikJariDikenal = {
  berkas: {
    [SHA_RESMI]: { nama: 'Template LEDPS LAM Teknik 2025 (Seluruh Jenjang)', tahun: 2025, skema: 'reguler', sumber: 'lamteknik.or.id', status: 'resmi' },
    pjj: { nama: 'Template LEDPS LAM Teknik 2025 PJJ', tahun: 2025, skema: 'pjj', sumber: 'lamteknik.or.id', status: 'resmi' },
    [SHA_LAMA]: { nama: 'Template LED APS Akademik dan Vokasi', tahun: null, skema: 'lama', sumber: 'folder LPMPP', status: 'usang' },
  },
  struktur: [{ tahun: 2025, skema: 'reguler', kriteria: K2025 }, { tahun: null, skema: 'lama', kriteria: KLAMA }],
};

const judulMatriks = (jenjang: string, tahun: number, apa = 'IAPS-AV') =>
  `MATRIKS PENILAIAN LAPORAN EVALUASI DIRI DAN LAPORAN KINERJA PROGRAM STUDI - ${jenjang} ${apa} ${tahun} 1.0`;

function matriks(o: Partial<BacaanBerkas> = {}): BacaanBerkas {
  return { jenis: 'matriks', sha256: 'm', judulAwal: '', tahun: 2025, jenjang: 'S1', kriteria: [...K2025], ...o };
}
function template(o: Partial<BacaanBerkas> = {}): BacaanBerkas {
  return { jenis: 'template', sha256: SHA_RESMI, judulAwal: '', tahun: null, jenjang: null, kriteria: [...K2025], ...o };
}
function periksa(o: Partial<MasukanPeriksa>): HasilPeriksa {
  return periksaBerkasInstrumen({
    jenis: 'matriks', namaBerkas: 'x.pdf', tahunIsian: 2025, jenjangVersi: 'S1', tahunAktif: null, bacaan: matriks(),
    dikenal: DIKENAL, waktu: new Date('2026-11-02T08:00:00Z'), ...o,
  });
}

test('tahun instrumen: 2020 sampai tahun berjalan + 2', () => {
  assert.equal(tahunInstrumenSah(2025, 2026), true);
  assert.equal(tahunInstrumenSah(2028, 2026), true);
  assert.equal(tahunInstrumenSah(2029, 2026), false);
  assert.equal(tahunInstrumenSah(2019, 2026), false);
  assert.equal(tahunInstrumenSah(2025.5, 2026), false);
  assert.equal(periksaTahunAktif(2025, 2030, 'S1'), 'Sudah ada instrumen aktif tahun 2030 untuk Sarjana; tahun 2025 lebih lama.');
  assert.equal(periksaTahunAktif(2030, 2025, 'S1'), null);
  assert.equal(periksaTahunAktif(2025, null, 'S1'), null);
});

test('jenis berkas dari isi: Matriks, Pedoman, Pedoman Penyusunan, Naskah Akademik, Template, Peringatan', () => {
  assert.equal(jenisPdf(`${judulMatriks('PROGRAM SARJANA', 2025, 'APS-AV')} No Kriteria Indikator 4 3 2 1 0 A. KRITERIA`), 'matriks');
  assert.equal(jenisPdf('LEMBAGA AKREDITASI PROGRAM STUDI KETEKNIKAN PEDOMAN PENILAIAN AKREDITASI PROGRAM STUDI VOKASI, AKADEMIK & PROFESI INSINYUR 2025'), 'pedoman');
  assert.equal(jenisPdf('Lampiran 2 Peraturan LAM Teknik Nomor 5 Tahun 2025 PEDOMAN PENYUSUNAN LAPORAN EVALUASI DIRI'), 'pedoman-penyusunan');
  assert.equal(jenisPdf('NASKAH AKADEMIK INSTRUMEN AKREDITASI'), 'naskah-akademik');
  assert.equal(jenisPdf('Daftar hadir rapat'), 'tidak-dikenal');
  assert.equal(jenisDocx(['HALAMAN MUKA', 'LAPORAN EVALUASI DIRI PROGRAM STUDI AKREDITASI PROGRAM STUDI']), 'template');
  assert.equal(jenisDocx(['Peringatan Pengisian Laporan Evaluasi Diri (LED)', 'Peringatan']), 'peringatan');
  assert.equal(jenisDocx(['TEMPLATE LAPORAN KINERJA PROGRAM STUDI']), 'lkps');
  assert.equal(jenisDocx(['INSTRUMEN AKREDITASI PERTAMA PROGRAM STUDI']), 'tidak-dikenal');
});

test('lapis 1: tahun dan jenjang dibaca dari teks Matriks dan Pedoman', () => {
  assert.equal(tahunDariTeks(judulMatriks('PROGRAM DIPLOMA TIGA', 2025)), 2025);
  assert.equal(tahunDariTeks(`${judulMatriks('PROGRAM SARJANA', 2030, 'APS-AV')} ${judulMatriks('PROGRAM SARJANA', 2030, 'APS-AV')}`), 2030);
  assert.equal(tahunDariTeks('PEDOMAN PENILAIAN AKREDITASI PROGRAM STUDI VOKASI 2025 Lampiran 10 Peraturan LAM Teknik Nomor 6 Tahun 2025'), 2025);
  assert.equal(tahunDariTeks('Naskah Akademik Instrumen LAM Teknik 2030'), 2030);
  assert.equal(tahunDariTeks('Undang-Undang Nomor 12 Tahun 2012 tentang Pendidikan Tinggi'), null, 'tahun peraturan lain tidak dipakai');
  // sampul resmi Matriks D3 salah tulis "PROGRAM DIPLOMA SATU"; judul halaman yang dipakai
  const d3 = `${judulMatriks('PROGRAM DIPLOMA TIGA', 2025)} MATRIKS PENILAIAN ... PROGRAM DIPLOMA SATU LEMBAGA AKREDITASI ${judulMatriks('PROGRAM DIPLOMA TIGA', 2025)}`;
  assert.equal(jenjangDariMatriks(d3), 'D3');
  assert.equal(jenjangDariMatriks(judulMatriks('PROGRAM SARJANA TERAPAN', 2025, 'APS-AV')), 'STr');
  assert.equal(jenjangDariMatriks(judulMatriks('PROGRAM SARJANA', 2025, 'APS-AV')), 'S1');
  assert.equal(jenjangDariMatriks(judulMatriks('PROGRAM DIPLOMATIGA PJJ', 2025)), 'D3');
  assert.equal(jenjangDariMatriks(judulMatriks('PROGRAM PROFESI INSINYUR', 2025)), 'PPI');
  assert.equal(jenjangDariMatriks(judulMatriks('PROGRAM MAGISTER TERAPAN', 2025)), 'S2Tr');
  assert.equal(jenjangDariMatriks('MATRIKS PENILAIAN LED DAN LKPS - SARJANA TERAPAN UNGGUL INTERNASIONAL APS-AV 2025 1.0'), 'STr');
  assert.equal(jenjangDariMatriks('Akreditasi Program Studi LAM Teknik 2 Program Diploma Tiga'), 'D3', 'kaki halaman bila judul tidak ada');
  assert.equal(jenjangDariMatriks('tanpa jenjang'), null);
});

test('lapis 2: kriteria matriks dari konteks, kriteria template lama dari judul bergaya heading', () => {
  assert.deepEqual(kriteriaDariKonteks([
    ['A. KRITERIA', 'I. Diferensiasi Misi (Visi, Misi, Tujuan, dan Strategi)', 'Visi, Misi Tujuan dan Sasaran'],
    ['A. KRITERIA', 'I. Diferensiasi Misi (Visi, Misi, Tujuan, dan Strategi)'],
    ['A. KRITERIA', 'II. Akuntabilitas'],
    ['B. PROGRAM PENGEMBANGAN BERKELANJUTAN'],
  ]), ['Diferensiasi Misi (Visi, Misi, Tujuan, dan Strategi)', 'Akuntabilitas']);

  const p = (teks: string, gaya: string, numId: string | null = null, ilvl = 0): ParagrafTemplate => ({ teks, gaya, numId, ilvl, kotak: false });
  const lama = [
    p('LAPORAN EVALUASI DIRI PROGRAM STUDI', 'heading 1'),
    p('Kondisi Eksternal', 'heading 3', '8', 0),
    p('Kriteria Akreditasi', 'heading 3', '8', 0),
    p('Visi, Misi, Tujuan, dan Strategi', 'heading 3', '7', 1),
    p('Kebijakan', 'heading 3', '7', 2),
    p('Bagian ini mendeskripsikan kebijakan', 'heading 3'),
    p('Tata Pamong, Tata Kelola dan Kerja sama', 'heading 3', '7', 1),
    p('Indikator Kinerja Utama', 'heading 3', '7', 2),
    p('Mahasiswa', 'heading 3', '7', 1),
    p('Analisis dan Penetapan Program Pengembangan', 'heading 3', '8', 0),
    p('Analisis SWOT', 'heading 3', '9', 1),
  ];
  assert.deepEqual(kriteriaTemplateCadangan(lama), ['Visi, Misi, Tujuan, dan Strategi', 'Tata Pamong, Tata Kelola dan Kerja sama', 'Mahasiswa']);
  assert.deepEqual(kriteriaTemplateCadangan([p('Bab I', 'heading 1')]), [], 'tanpa "Kriteria Akreditasi"');
});

test('lapis 2: kecocokan kriteria abaikan huruf besar, tanda baca, spasi; PkM = Pengabdian kepada Masyarakat', () => {
  assert.equal(cocokKriteria(K2025, { kriteria: K2025 }).cocok, true);
  assert.equal(cocokKriteria(K2025, { kriteria: ['Akuntabilita s', ...K2025.filter((k) => k !== 'Akuntabilitas')] }).cocok, true, 'teks PDF terpotong');
  assert.equal(cocokKriteria(['Relevansi Penelitian dan Pengabdian kepada Masyarakat'], { kriteria: ['Relevansi Penelitian dan PkM'] }).cocok, true);
  // kriteria yang tidak terbaca sebagai konteks dicari di seluruh teks matriks
  const teks = teksKunciMatriks(`A. KRITERIA ${K2025.map((k, i) => `${'I II III IV V VI VII'.split(' ')[i]}. ${k}`).join(' 1 Kekhasan ')}`);
  assert.equal(cocokKriteria(K2025, { kriteria: K2025.slice(0, 5), teksKunci: teks }).cocok, true);
  const lama = cocokKriteria(KLAMA, { kriteria: K2025 });
  assert.equal(lama.cocok, false);
  assert.ok(lama.hilang.includes('Tata Pamong, Tata Kelola dan Kerja sama'));
  assert.ok(lama.lebih.includes('Akuntabilitas'));
  assert.equal(cocokKriteria([], { kriteria: K2025 }).cocok, false, 'template tanpa kriteria tidak dianggap cocok');
});

test('I1: tahun di teks matriks ≠ isian ditolak, ke arah mana pun', () => {
  const a = periksa({ tahunIsian: 2025, bacaan: matriks({ tahun: 2030 }) });
  assert.equal(a.diterima, false);
  assert.equal(a.judul, 'Berkas ditolak: tahun tidak sesuai');
  assert.equal(a.alasan, 'Matriks Penilaian ini instrumen tahun 2030, sedangkan tahun instrumen yang diisi 2025.');
  assert.ok(a.terbaca.some((t) => t.label === 'Tahun di teks' && t.nilai === '2030'));
  assert.equal(periksa({ tahunIsian: 2030, bacaan: matriks({ tahun: 2025 }) }).diterima, false);
  assert.equal(periksa({ jenis: 'pedoman', tahunIsian: 2030, bacaan: { ...matriks({ tahun: 2025 }), jenis: 'pedoman', kriteria: null } }).diterima, false);
});

test('I1: tahun baru yang cocok tidak pernah ditolak, walaupun strukturnya belum dikenal', () => {
  const k2030 = ['Misi Berdampak', 'Tata Kelola Digital', 'Kurikulum Adaptif', 'Sumber Daya', 'Luaran'];
  const tpl = template({ sha256: 'baru', kriteria: k2030 });
  const mat = matriks({ tahun: 2030, kriteria: k2030 });
  const t = periksa({ jenis: 'template', tahunIsian: 2030, bacaan: tpl, pasangan: mat });
  assert.equal(t.diterima, true);
  assert.ok(t.info.some((x) => /cocok dengan Matriks \(5 kriteria\)/.test(x)));
  assert.ok(t.info.some((x) => /belum dikenal/.test(x)));
  assert.equal(periksa({ tahunIsian: 2030, bacaan: mat, pasangan: tpl }).diterima, true);
  // template yang sama dengan 2025 dipakai untuk 2030 dengan matriks 2030 berkriteria sama
  const ulang = periksa({ jenis: 'template', tahunIsian: 2030, bacaan: template(), pasangan: matriks({ tahun: 2030 }) });
  assert.equal(ulang.diterima, true);
  assert.ok(ulang.info.some((x) => x.startsWith('Template LED ini sama persis dengan Template LEDPS LAM Teknik 2025')));
});

test('I1: kriteria template tidak cocok dengan matriks → ditolak (template LPMPP 2022 tanpa sidik jari)', () => {
  const tanpaSidik: SidikJariDikenal = { ...DIKENAL, berkas: {} };
  const h = periksa({ jenis: 'template', bacaan: template({ sha256: 'lain', kriteria: KLAMA }), pasangan: matriks(), dikenal: tanpaSidik });
  assert.equal(h.diterima, false);
  assert.equal(h.judul, 'Berkas ditolak: kriteria template tidak cocok dengan Matriks');
  assert.match(h.alasan, /^Kriteria di Template LED \(Visi, Misi, Tujuan, dan Strategi; .*\) tidak sama dengan kriteria di Matriks 2025 \(Diferensiasi Misi/);
  assert.match(h.alasan, /struktur LED lama/);
  // matriks yang diunggah setelah template lama juga ditolak
  assert.equal(periksa({ bacaan: matriks(), pasangan: template({ sha256: 'lain', kriteria: KLAMA }), dikenal: tanpaSidik }).diterima, false);
});

test('I1: sidik jari usang ditolak; skema lain wajib dikonfirmasi', () => {
  const h = periksa({ jenis: 'template', bacaan: template({ sha256: SHA_LAMA, kriteria: KLAMA }) });
  assert.equal(h.diterima, false);
  assert.equal(h.judul, 'Berkas ditolak: berkas usang');
  assert.equal(h.alasan, 'Berkas ini Template LED APS Akademik dan Vokasi (struktur LED lama, folder LPMPP).');
  assert.equal(h.langkah, 'Gunakan Template LEDPS LAM Teknik 2025 dari lamteknik.or.id.');
  const pjj = periksa({ jenis: 'template', bacaan: template({ sha256: 'pjj' }) });
  assert.equal(pjj.diterima, true);
  assert.deepEqual(pjj.konfirmasi.map((k) => k.jenis), ['skema']);
  assert.match(pjj.konfirmasi[0].teks, /Pendidikan Jarak Jauh/);
});

test('I1: jenjang, salah jenis berkas, tahun lebih lama dari versi aktif, tahun tidak tertulis', () => {
  const d3 = periksa({ bacaan: matriks({ jenjang: 'D3' }) });
  assert.equal(d3.diterima, false);
  assert.equal(d3.alasan, 'Matriks ini untuk Diploma Tiga, sedangkan instrumen ini untuk Sarjana.');
  const ped = periksa({ bacaan: matriks({ jenis: 'pedoman', jenjang: null, kriteria: null }) });
  assert.equal(ped.diterima, false);
  assert.equal(ped.alasan, 'Berkas ini tampaknya Pedoman Penilaian, bukan Matriks Penilaian.');
  assert.equal(periksa({ jenis: 'template', bacaan: template({ jenis: 'rusak', kriteria: null }) }).langkah, 'Simpan ulang sebagai .docx lalu unggah lagi.');
  const lama = periksa({ tahunAktif: 2030 });
  assert.equal(lama.diterima, false);
  assert.equal(lama.alasan, 'Sudah ada instrumen aktif tahun 2030 untuk Sarjana; tahun 2025 lebih lama.');
  const tanpaTahun = periksa({ bacaan: matriks({ tahun: null }) });
  assert.equal(tanpaTahun.diterima, true);
  assert.deepEqual(tanpaTahun.konfirmasi, [{ jenis: 'tahun', teks: 'Tahun tidak ditemukan di teks Matriks Penilaian. Saya sudah memastikan berkas ini instrumen tahun 2025.' }]);
});

test('konfirmasi berlaku untuk tahun dan berkas saat dicentang; riwayat menyimpan tiga penolakan terakhir', () => {
  const perlu = [{ jenis: 'tahun' as const, teks: 't', berkas: 'matriks' as const }];
  assert.equal(konfirmasiTertunda(perlu, {}, 2030, { matriks: 'a' }).length, 1);
  assert.equal(konfirmasiTertunda(perlu, { tahun: { tahun: 2030, sha256: ['a'] } }, 2030, { matriks: 'a' }).length, 0);
  assert.equal(konfirmasiTertunda(perlu, { tahun: { tahun: 2029, sha256: ['a'] } }, 2030, { matriks: 'a' }).length, 1, 'tahun berubah');
  assert.equal(konfirmasiTertunda(perlu, { tahun: { tahun: 2030, sha256: ['a'] } }, 2030, { matriks: 'b' }).length, 1, 'berkas diganti');
  const h = (n: number) => ({ ...periksa({ tahunAktif: 2030 }), namaBerkas: `${n}.pdf` });
  assert.deepEqual(tambahRiwayat([h(3), h(2), h(1)], h(4)).map((x) => x.namaBerkas), ['4.pdf', '3.pdf', '2.pdf']);
});
