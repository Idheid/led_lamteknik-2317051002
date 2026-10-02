import { enkode, gabungBody, normal, pecahBody, setelTeks, teksElemen, gantiTeks, type Elemen } from './xml';

/**
 * F-23: halaman muka, identitas pengusul, daftar prodi UPPS, identitas tim penyusun, serta Tabel 2.1/2.2 diisi dari
 * data proyek. Nilai yang belum ada ditulis "–" dan dilaporkan sebagai peringatan (bukan dibiarkan titik-titik).
 */

export interface AnggotaTim {
  nama: string;
  nomorInduk: string;
  jabatan: string;
  tugas: string;
}

export interface DataEkspor {
  perguruanTinggi: string;
  upps: string;
  jenisProgram: string;
  namaProdi: string;
  kota: string;
  tahun: string;
  tanggalPengisian: string;
  identitas: Partial<Record<
    'alamat' | 'telepon' | 'emailWebsite' | 'skPendirian' | 'tanggalSkPendirian' | 'pejabatSkPendirian' | 'skPembukaan'
    | 'tanggalSkPembukaan' | 'pejabatSkPembukaan' | 'tahunPertamaMenerima' | 'peringkatAkreditasi' | 'nomorSkAkreditasi', string
  >>;
  prodiUpps: string[][]; // No, Jenis program, Nama PS, Status/peringkat, No. dan tgl SK, Tgl kedaluwarsa, Jumlah mahasiswa
  timDosen: AnggotaTim[];
  timTendik: AnggotaTim[];
}

const KOSONG = '–';

/** Label baris identitas pengusul (teks sebelum titik dua, dinormalkan) → kunci nilai. */
const LABEL_IDENTITAS: [string, keyof DataEkspor['identitas'] | 'perguruanTinggi' | 'upps' | 'jenisProgram' | 'namaProdi'][] = [
  ['perguruantinggi', 'perguruanTinggi'],
  ['unitpengelolaprogramstudi', 'upps'],
  ['jenisprogram', 'jenisProgram'],
  ['namaprogramstudi', 'namaProdi'],
  ['alamat', 'alamat'],
  ['nomortelepon', 'telepon'],
  ['emaildanwebsite', 'emailWebsite'],
  ['nomorskpendirianpt1', 'skPendirian'],
  ['tanggalskpendirianpt', 'tanggalSkPendirian'],
  ['skpendirianpt', 'pejabatSkPendirian'],
  ['nomorskpembukaanps2', 'skPembukaan'],
  ['tanggalskpembukaanps', 'tanggalSkPembukaan'],
  ['skpembukaanps', 'pejabatSkPembukaan'],
  ['menerimamahasiswa', 'tahunPertamaMenerima'],
  ['akreditasips', 'peringkatAkreditasi'],
  ['nomorskakreditasiterakhir3', 'nomorSkAkreditasi'],
];

/** Isi teks paragraf; bila paragraf belum punya node teks, tambahkan satu run. */
export function isiParagraf(xml: string, teks: string): string {
  if (/<w:t[\s>]/.test(xml)) return setelTeks(xml, teks);
  return xml.replace(/<\/w:p>\s*$/, `<w:r><w:t xml:space="preserve">${enkode(teks)}</w:t></w:r></w:p>`);
}

// ------------------------------------------------------------------ tabel

function baris(tbl: string): { awal: string; tr: string[]; akhir: string } {
  const tr = [...tbl.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)];
  if (tr.length === 0) return { awal: tbl, tr: [], akhir: '' };
  return {
    awal: tbl.slice(0, tr[0].index),
    tr: tr.map((m) => m[0]),
    akhir: tbl.slice(tr[tr.length - 1].index! + tr[tr.length - 1][0].length),
  };
}

function sel(tr: string): string[] {
  return [...tr.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
}

function teksSel(tc: string): string {
  return teksElemen(tc.replace(/^<w:tc\b[^>]*>/, '<w:p>').replace(/<\/w:tc>$/, '</w:p>'));
}

function isiSel(tc: string, teks: string): string {
  const p = [...tc.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)];
  if (p.length === 0) return tc;
  const pertama = isiParagraf(p[0][0], teks);
  let hasil = tc.slice(0, p[0].index) + pertama;
  // paragraf lain di sel dibuang (berisi contoh isian)
  hasil += tc.slice(p[p.length - 1].index! + p[p.length - 1][0].length);
  return hasil;
}

/**
 * Ganti baris contoh tabel ("1", "2", "…") dengan baris data. Baris judul, baris nomor kolom (1, 2, 3, …), dan baris
 * "Jumlah" dipertahankan. Baris contoh pertama dipakai sebagai cetakan format.
 */
export function isiTabel(tbl: string, data: string[][]): string {
  const { awal, tr, akhir } = baris(tbl);
  const nomorKolom = (r: string) => {
    const t = sel(r).map(teksSel);
    return t.length > 2 && t.every((x, i) => x === String(i + 1));
  };
  const contoh = tr.map((r, i) => i > 0 && !nomorKolom(r) && /^(\d+\.?|…|\.{2,})$/.test(teksSel(sel(r)[0] ?? '')));
  const iContoh = contoh.indexOf(true);
  if (iContoh < 0) return tbl;
  const cetakan = tr[iContoh];
  const isi = (data.length ? data : [[KOSONG]]).map((d) => {
    const c = sel(cetakan);
    let r = cetakan;
    c.forEach((tc, k) => {
      r = r.replace(tc, isiSel(tc, d[k] ?? (data.length ? '' : KOSONG)));
    });
    return r;
  });
  const hasil: string[] = [];
  tr.forEach((r, i) => {
    if (i === iContoh) hasil.push(...isi);
    else if (!contoh[i]) hasil.push(r);
  });
  return awal + hasil.join('') + akhir;
}

// ------------------------------------------------------------------ isi dokumen

export interface HasilIsiData {
  xml: string;
  peringatan: string[];
}

function cari(elemen: Elemen[], dari: number, uji: (teks: string, e: Elemen) => boolean): number {
  for (let i = dari; i < elemen.length; i++) if (uji(elemen[i].tag === 'p' ? teksElemen(elemen[i].xml) : '', elemen[i])) return i;
  return -1;
}

export function isiDataProyek(documentXml: string, d: DataEkspor): HasilIsiData {
  const { awal, elemen, akhir } = pecahBody(documentXml);
  const peringatan: string[] = [];
  const nilai = (k: string, label: string) => {
    const v = (d as unknown as Record<string, string>)[k] ?? d.identitas[k as keyof DataEkspor['identitas']];
    if (!v || !v.trim()) {
      peringatan.push(`${label} belum diisi (diisi super admin di identitas prodi).`);
      return KOSONG;
    }
    return v.trim();
  };

  // halaman muka
  const iMuka = cari(elemen, 0, (t) => normal(t) === 'halamanmuka');
  const iIdentitas = cari(elemen, Math.max(iMuka, 0), (t) => normal(t) === 'identitaspengusul');
  if (iMuka >= 0 && iIdentitas > iMuka) {
    for (let i = iMuka + 1; i < iIdentitas; i++) {
      const e = elemen[i];
      const t = teksElemen(e.xml);
      const n = normal(t);
      if (n === 'programdannamaprogramstudi') e.xml = setelTeks(e.xml, `PROGRAM ${d.jenisProgram} ${d.namaProdi}`.toUpperCase());
      else if (n.startsWith('universitasinstitut')) e.xml = setelTeks(e.xml, d.perguruanTinggi.toUpperCase());
      else if (/^\.{5,}$/.test(t)) e.xml = setelTeks(e.xml, d.upps.toUpperCase());
      else if (n === 'namakotakedudukanperguruantinggi') e.xml = setelTeks(e.xml, nilai('kota', 'Kota kedudukan perguruan tinggi').toUpperCase());
      else if (n.startsWith('tahun')) e.xml = setelTeks(e.xml, `TAHUN ${d.tahun}`);
      else if (n.startsWith('catatankelengkapanisian')) e.xml = setelTeks(e.xml, '');
    }
    if (elemen.slice(iMuka, iIdentitas).some((e) => /Logo Perguruan Tinggi/.test(e.xml))) {
      peringatan.push('Kotak "Logo Perguruan Tinggi" di halaman muka perlu diganti logo asli secara manual di Word.');
    }
  }

  // identitas pengusul
  const iTim = cari(elemen, Math.max(iIdentitas, 0), (t) => normal(t) === 'identitastimpenyusun');
  if (iIdentitas >= 0) {
    const batas = iTim > 0 ? iTim : elemen.length;
    for (let i = iIdentitas + 1; i < batas; i++) {
      const e = elemen[i];
      if (e.tag === 'tbl') {
        if (normal(teksElemen(e.xml.replace(/<w:tbl\b[^>]*>/, '<w:p>').replace(/<\/w:tbl>$/, '</w:p>'))).startsWith('nojenisprogram')) {
          e.xml = isiTabel(e.xml, d.prodiUpps);
        }
        continue;
      }
      const t = teksElemen(e.xml);
      const m = /^(.*?):\s*\.{5,}/.exec(t);
      if (!m) continue;
      const label = normal(m[1]);
      const kunci = LABEL_IDENTITAS.find(([l]) => l === label)?.[1];
      if (!kunci) continue;
      const v = nilai(kunci, m[1].replace(/\s*\d\)\s*$/, '').trim());
      e.xml = gantiTeks(e.xml, /\.{5,}.*$/, () => v);
    }
  }

  // identitas tim penyusun: blok Nama/NIDN/Jabatan/Tanggal per dosen penyusun
  if (iTim >= 0) {
    const iSelesai = cari(elemen, iTim + 1, (t) => normal(t) === 'katapengantar');
    const batas = iSelesai > 0 ? iSelesai : elemen.length;
    const mulaiBlok: number[] = [];
    for (let i = iTim + 1; i < batas; i++) if (/^nama\s*:/i.test(teksElemen(elemen[i].xml))) mulaiBlok.push(i);
    if (mulaiBlok.length > 0) {
      const akhirBlok = (k: number) => {
        if (k + 1 < mulaiBlok.length) return mulaiBlok[k + 1];
        // blok terakhir: sampai paragraf "Tanggal Pengisian" ditambah paragraf kosong sesudahnya
        let j = mulaiBlok[k];
        while (j < batas && !/tanggal pengisian/i.test(teksElemen(elemen[j].xml) + elemen[j].xml.replace(/<[^>]+>/g, ''))) j += 1;
        j += 1;
        while (j < batas && teksElemen(elemen[j].xml) === '' && !/<w:br w:type="page"\/>|<w:sectPr/.test(elemen[j].xml)) j += 1;
        return j;
      };
      const cetak = elemen.slice(mulaiBlok[0], akhirBlok(0)).map((e) => e.xml);
      const anggota = d.timDosen.length ? d.timDosen : [];
      if (!anggota.length) peringatan.push('Tim penyusun belum diisi (menu Tim penyusun).');
      const blokBaru = (a: AnggotaTim | null) => cetak.map((x) => {
        const t = teksElemen(x);
        if (/^nama\s*:/i.test(t)) return gantiTeks(x, /\.{5,}.*$/, () => a?.nama || KOSONG);
        if (/^nidn/i.test(t)) return gantiTeks(x, /\.{5,}.*$/, () => a?.nomorInduk || KOSONG);
        if (/^jabatan\s*:/i.test(t)) return gantiTeks(x, /\.{5,}.*$/, () => a?.jabatan || KOSONG);
        return gantiTeks(x, /DD\s*–\s*MM\s*–\s*YYYY/, () => d.tanggalPengisian, { termasukKotak: true });
      }).join('');
      const pengganti = (anggota.length ? anggota : [null]).map(blokBaru).join('');
      const dari = mulaiBlok[0];
      const sampai = akhirBlok(mulaiBlok.length - 1);
      elemen.splice(dari, sampai - dari, { tag: 'p', xml: pengganti });
    }
  }

  // Tabel 2.1 (dosen) dan 2.2 (tenaga kependidikan) di Bab II.A
  const isiTabelBab2 = (pola: RegExp, data: AnggotaTim[]) => {
    const i = cari(elemen, 0, (t) => pola.test(t));
    if (i < 0) return;
    const j = cari(elemen, i + 1, (_t, e) => e.tag === 'tbl');
    if (j < 0 || j - i > 3) return;
    elemen[j].xml = isiTabel(elemen[j].xml, data.map((a, k) => [String(k + 1), a.nama, a.nomorInduk, a.jabatan, a.tugas]));
  };
  isiTabelBab2(/^Tabel 2\.1\.?\s/i, d.timDosen);
  isiTabelBab2(/^Tabel 2\.2\.?\s/i, d.timTendik);

  return { xml: gabungBody(awal, elemen, akhir), peringatan: [...new Set(peringatan)] };
}
