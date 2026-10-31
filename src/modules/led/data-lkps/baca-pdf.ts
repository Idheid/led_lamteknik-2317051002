import { getDocumentProxy } from "unpdf";
import type { BarisLkps, HasilBacaLkps, KolomLkps, NilaiSel, TabelBaca } from "./jenis";
import { periksaIsi } from "./periksa";
import { kodeTabelDariSheet, pilihBlokJenjang, sheetBerlakuUntuk } from "./struktur";
import KOLOM_TEMPLATE_JSON from "./kolom-template.json";

/**
 * F-09: pembaca LKPS PDF (cadangan). Hasilnya selalu ditandai `perluDicek` dan bisa dikoreksi manual.
 *
 * Cara kerja (untuk PDF hasil cetak/ekspor template LKPS dari Excel):
 * 1. Teks setiap halaman dibaca beserta posisinya (pdf.js lewat unpdf) lalu dikelompokkan menjadi baris.
 * 2. Baris berawalan "Tabel" dicocokkan dengan judul sheet template (kolom-template.json) → sheet aktif.
 * 3. Baris nomor kolom (1, 2, 3, ...) menjadi patokan posisi kolom; kolom template tanpa nomor (misalnya
 *    "Doktor" di 4.a) dipatok dari posisi judulnya di baris judul.
 * 4. Setiap potongan teks data dimasukkan ke kolom dengan patokan terdekat. Baris tanpa isi di kolom pertama
 *    dianggap lanjutan teks baris sebelumnya (sel yang terbungkus beberapa baris).
 * Kolom yang kosong tidak tercetak di PDF, jadi pemetaan posisi inilah yang menjaga data tetap di kolom yang benar.
 */

export interface BlokTemplate {
  blok: string | null;
  jenjang: string[];
  kolom: KolomLkps[];
}

export type KolomTemplate = Record<string, BlokTemplate[]>;

export interface DataTemplate {
  judul: Record<string, string[]>;
  kolom: KolomTemplate;
}

const TEMPLATE = KOLOM_TEMPLATE_JSON as unknown as DataTemplate;

interface Potongan {
  teks: string;
  x: number;
  lebar: number;
}

interface BarisTeks {
  halaman: number;
  y: number;
  potongan: Potongan[];
}

const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\-]+/g, " ").replace(/\s+/g, " ").trim();
const tengah = (p: Potongan) => p.x + p.lebar / 2;
const teksBaris = (b: BarisTeks) => b.potongan.map((p) => p.teks).join(" ");

async function bacaBarisTeks(berkas: Uint8Array): Promise<BarisTeks[]> {
  const pdf = await getDocumentProxy(berkas);
  const semua: BarisTeks[] = [];
  for (let h = 1; h <= pdf.numPages; h++) {
    const halaman = await pdf.getPage(h);
    const isi = await halaman.getTextContent();
    const baris: BarisTeks[] = [];
    for (const item of isi.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      let b = baris.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!b) {
        b = { halaman: h, y, potongan: [] };
        baris.push(b);
      }
      b.potongan.push({ teks: item.str.trim(), x, lebar: item.width });
    }
    baris.sort((a, b) => b.y - a.y); // atas ke bawah
    for (const b of baris) b.potongan.sort((p, q) => p.x - q.x);
    semua.push(...baris);
  }
  return semua;
}

/** Sheet yang judulnya paling cocok dengan baris teks mulai indeks i (judul bisa dua baris). */
function cocokkanJudul(baris: BarisTeks[], i: number): string | null {
  const jendela = baris.slice(i, i + 3).map((b) => normal(teksBaris(b)));
  let terbaik: { sheet: string; skor: number } | null = null;
  for (const [sheet, judul] of Object.entries(TEMPLATE.judul)) {
    if (judul.length === 0) continue;
    const kena = judul.filter((j) => {
      const nj = normal(j);
      const awal = nj.slice(0, Math.min(nj.length, 32));
      return jendela.some((l) => l.startsWith(awal) || (l.length >= 12 && nj.startsWith(l)));
    }).length;
    if (kena === 0 || !normal(judul[0]).startsWith(jendela[0].slice(0, 8))) continue;
    // semua baris judul harus cocok; yang lebih spesifik (lebih banyak baris judul) menang
    if (kena === judul.length && (!terbaik || kena > terbaik.skor)) terbaik = { sheet, skor: kena };
  }
  return terbaik?.sheet ?? null;
}

function barisNomorKolom(b: BarisTeks): boolean {
  const p = b.potongan.map((x) => x.teks);
  return p.length >= 3 && p[0] === "1" && p[1] === "2" && p[2] === "3" && p.every((t) => /^\d+$/.test(t));
}

interface Patokan {
  kunci: string;
  x: number;
}

/** Patokan posisi kolom: nomor kolom tercetak + judul untuk kolom template tanpa nomor. */
function buatPatokan(nomor: BarisTeks, judul: BarisTeks[], kolom: KolomLkps[]): Patokan[] {
  const bernomor = kolom.filter((k) => k.nomor !== "");
  const hasil: Patokan[] = nomor.potongan.slice(0, bernomor.length).map((p, i) => ({ kunci: bernomor[i].kunci, x: tengah(p) }));
  for (const k of kolom.filter((x) => x.nomor === "")) {
    const akhir = normal(k.label.split(" / ").pop() ?? "").slice(0, 7);
    if (!akhir) continue;
    const p = judul.flatMap((b) => b.potongan).find((x) => normal(x.teks).startsWith(akhir));
    if (p) hasil.push({ kunci: k.kunci, x: tengah(p) });
  }
  return hasil.sort((a, b) => a.x - b.x);
}

/**
 * Batas kiri setiap kolom: posisi awal teks paling kiri yang berada di antara patokan kolom sebelumnya dan patokan
 * kolom ini (teks rata kiri dimulai tepat di tepi kolom). Bila kolom tidak berisi teks, dipakai titik tengah.
 */
function batasKolom(patokan: Patokan[], baris: BarisTeks[]): { kunci: string; x: number }[] {
  const awal = baris.flatMap((b) => b.potongan.map((p) => p.x));
  return patokan.map((p, i) => {
    if (i === 0) return { kunci: p.kunci, x: -Infinity };
    const kiri = patokan[i - 1].x;
    const calon = awal.filter((x) => x > kiri + 0.5 && x <= p.x + 0.5);
    return { kunci: p.kunci, x: calon.length ? Math.min(...calon) - 0.5 : (kiri + p.x) / 2 };
  });
}

function kolomUntuk(batas: { kunci: string; x: number }[], x: number): string {
  let k = batas[0].kunci;
  for (const b of batas) if (x >= b.x) k = b.kunci;
  return k;
}

interface BlokSementara {
  label: string | null;
  judulBaris: BarisTeks[];
  patokan: Patokan[] | null;
  data: BarisTeks[];
}

interface TabelSementara {
  sheet: string;
  blokTemplate: BlokTemplate[];
  blok: BlokSementara[];
}

/** Ubah baris teks satu blok menjadi baris tabel. */
function susunBaris(b: BlokSementara, mulai: number): BarisLkps[] {
  if (!b.patokan || b.patokan.length === 0) return [];
  const batas = batasKolom(b.patokan, b.data);
  const hasil: BarisLkps[] = [];
  let nomor = mulai;
  for (const garis of b.data) {
    const sel: Record<string, string> = {};
    for (const p of garis.potongan) {
      const k = kolomUntuk(batas, p.x);
      sel[k] = sel[k] ? `${sel[k]} ${p.teks}` : p.teks;
    }
    const sebelumnya = hasil[hasil.length - 1];
    // lanjutan hanya bila semua kolom yang terisi juga terisi di baris sebelumnya (teks terbungkus);
    // baris tanpa nomor yang mengisi kolom baru (misalnya rincian a–f Tabel 2.b) adalah baris baru
    // dan tidak berisi angka berdiri sendiri (angka muat di baris pertama sel, hanya teks yang terbungkus)
    const lanjutan = sebelumnya && !sel.A
      && Object.keys(sel).every((k) => sebelumnya.sel[k] !== null && sebelumnya.sel[k] !== undefined)
      && !Object.values(sel).some((v) => /^-?[\d.,]+%?$/.test(v));
    if (lanjutan) {
      // lanjutan sel yang terbungkus beberapa baris
      for (const [k, v] of Object.entries(sel)) sebelumnya.sel[k] = sebelumnya.sel[k] ? `${sebelumnya.sel[k]} ${v}` : v;
      continue;
    }
    if (sel.A && /^[IVX]+$/.test(sel.A) && Object.keys(sel).length <= 2) continue; // baris kategori
    if (/^(jumlah|total)$/i.test(sel.A ?? "") || /^(jumlah|total)$/i.test(sel.B ?? "")) continue;
    hasil.push({ nomorBaris: ++nomor, sel: Object.fromEntries(Object.entries(sel).map(([k, v]) => [k, nilai(v)])) });
  }
  return hasil;
}

/** Teks sel PDF; tanggal HH/BB/TTTT diubah ke YYYY-MM-DD seperti hasil baca Excel. */
function nilai(t: string): NilaiSel {
  const s = t.trim();
  if (s === "") return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

/** Baca LKPS PDF untuk satu jenjang. */
export async function bacaLkpsPdf(berkas: Buffer | Uint8Array, jenjang: string): Promise<HasilBacaLkps> {
  let baris: BarisTeks[];
  try {
    baris = await bacaBarisTeks(new Uint8Array(berkas));
  } catch {
    return {
      tabel: [],
      identitas: { tanggalTs: null, namaProgramStudi: null },
      masalah: [{ tingkat: "galat", sheet: null, pesan: "Berkas tidak bisa dibuka sebagai PDF." }],
    };
  }

  const selesai: TabelSementara[] = [];
  let aktif = null as TabelSementara | null;
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    const awal = b.potongan[0]?.teks ?? "";
    if (/^tabel\b/i.test(awal)) {
      const sheet = cocokkanJudul(baris, i);
      if (sheet && sheet !== aktif?.sheet) {
        aktif = { sheet, blokTemplate: TEMPLATE.kolom[sheet] ?? [], blok: [{ label: null, judulBaris: [], patokan: null, data: [] }] };
        selesai.push(aktif);
        continue;
      }
    }
    if (!aktif || aktif.blokTemplate.length === 0) continue;
    let blok = aktif.blok[aktif.blok.length - 1];
    if (/^diisi oleh/i.test(teksBaris(b))) {
      // label blok baru (6.d dan 6.f.1 punya satu blok per jenjang)
      if (blok.patokan || blok.label) aktif.blok.push((blok = { label: null, judulBaris: [], patokan: null, data: [] }));
      blok.label = teksBaris(b);
      blok.judulBaris = [];
      continue;
    }
    if (barisNomorKolom(b)) {
      if (!blok.patokan) {
        const bt = blokUntuk(aktif.blokTemplate, blok.label) ?? aktif.blokTemplate[0];
        blok.patokan = buatPatokan(b, blok.judulBaris, bt.kolom);
      }
      continue; // baris nomor kolom yang diulang di halaman berikutnya dilewati
    }
    if (!blok.patokan) blok.judulBaris.push(b);
    else blok.data.push(b);
  }

  const tabel: TabelBaca[] = [];
  let urutan = 0;
  for (const t of selesai) {
    if (!sheetBerlakuUntuk(t.sheet, jenjang)) continue;
    const blokData = t.blok.filter((b) => b.patokan);
    if (blokData.length === 0) continue;
    const label = blokData.map((b) => b.label);
    const berblok = t.blokTemplate.length > 1;
    let pilih = 0;
    if (berblok) {
      const i = pilihBlokJenjang(label, jenjang);
      if (i === null) continue;
      pilih = i;
    }
    const b = blokData[pilih];
    const bt = blokUntuk(t.blokTemplate, b.label) ?? t.blokTemplate.find((x) => x.jenjang.includes(jenjang)) ?? t.blokTemplate[0];
    const isi = susunBaris(b, urutan).map((r) => ({
      nomorBaris: r.nomorBaris,
      sel: Object.fromEntries(bt.kolom.map((k) => [k.kunci, r.sel[k.kunci] ?? null])),
    }));
    urutan += isi.length;
    tabel.push({
      kode: kodeTabelDariSheet(t.sheet),
      sheet: t.sheet,
      judul: TEMPLATE.judul[t.sheet]?.[TEMPLATE.judul[t.sheet].length - 1] ?? t.sheet,
      blok: berblok ? b.label : null,
      kolom: bt.kolom,
      baris: isi,
      kolomRumus: [],
    });
  }

  const masalah = periksaIsi(tabel, jenjang);
  const terbaca = new Set(tabel.map((t) => t.sheet));
  if (terbaca.size === 0) {
    masalah.unshift({
      tingkat: "galat",
      sheet: null,
      pesan: "Tidak ada tabel LKPS yang dikenali di PDF. Pastikan PDF berisi teks (bukan hasil pindai) dan dicetak dari template LKPS 2025.",
    });
  } else {
    masalah.unshift({
      tingkat: "peringatan",
      sheet: null,
      pesan: `Hasil baca PDF (${terbaca.size} tabel) perlu dicek: angka dan kolom bisa bergeser. Periksa dan koreksi setiap tabel.`,
    });
  }
  return { tabel, masalah, identitas: { tanggalTs: null, namaProgramStudi: null } };
}

function blokUntuk(daftar: BlokTemplate[], label: string | null): BlokTemplate | undefined {
  if (label === null) return undefined;
  return daftar.find((b) => b.blok !== null && normal(b.blok) === normal(label));
}
