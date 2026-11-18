import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { z } from "zod";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { tanggal } from "@/modules/lkps/domain/validasi";
import { parseOneDataKerjasama, parseOneDataMahasiswa, parseOneDataSDM, parseOneDataTracer } from "@/modules/lkps/data/onedata/parser";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/ingestion/route.ts.
// Gabung LKPS G4: pembaca Excel `xlsx` 0.18.5 diganti `exceljs` (masalah 7); format .xls lama tidak didukung exceljs.
// Data diterapkan ke prodi aktif saja (kode asal: prodiId bisa null, masalah 14). Tanggal kerja sama tidak lagi diisi
// hari ini / +1 tahun: bila berkas tidak memuat tanggal, impor kerja sama ditolak (masalah 13). Nilai cadangan lain di
// pengurai dan di penerapan tracer dipertahankan seperti kode asal (ditanyakan di ⏸ G4).

const UKURAN_MAKS_IMPOR = 10 * 1024 * 1024;
const BARIS_MAKS_IMPOR = 5000;

type Baris = Record<string, unknown>;

function nilaiSel(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return nilaiSel(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return v.text;
    if ("error" in v) return undefined;
  }
  return v;
}

/** Sheet pertama → array objek berkunci baris judul (setara `XLSX.utils.sheet_to_json` kode asal). */
function barisDariSheet(ws: ExcelJS.Worksheet | undefined): Baris[] {
  if (!ws) return [];
  const judul: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (sel, kol) => {
    const v = nilaiSel(sel.value);
    judul[kol] = v === undefined ? "" : String(v).trim();
  });
  const hasil: Baris[] = [];
  for (let r = 2; r <= ws.rowCount && hasil.length < BARIS_MAKS_IMPOR; r++) {
    const baris: Baris = {};
    ws.getRow(r).eachCell((sel, kol) => {
      const k = judul[kol];
      const v = nilaiSel(sel.value);
      if (k && v !== undefined && v !== "") baris[k] = v;
    });
    if (Object.keys(baris).length > 0) hasil.push(baris);
  }
  return hasil;
}

async function bacaBarisBerkas(nama: string, isi: Buffer): Promise<Baris[]> {
  const n = nama.toLowerCase();
  if (n.endsWith(".json")) {
    let json: unknown;
    try {
      json = JSON.parse(isi.toString("utf-8"));
    } catch {
      throw new GalatPengguna("Berkas JSON tidak dapat dibaca.");
    }
    const o = json as { data?: unknown; rows?: unknown };
    const rows = Array.isArray(json) ? json : Array.isArray(o?.data) ? o.data : Array.isArray(o?.rows) ? o.rows : [json];
    return rows.filter((r): r is Baris => !!r && typeof r === "object").slice(0, BARIS_MAKS_IMPOR);
  }
  const wb = new ExcelJS.Workbook();
  if (n.endsWith(".csv")) {
    const ws = await wb.csv.read(Readable.from(isi));
    return barisDariSheet(ws);
  }
  if (n.endsWith(".xls")) throw new GalatPengguna("Format .xls lama tidak didukung. Simpan ulang sebagai .xlsx.");
  if (!n.endsWith(".xlsx") || isi.subarray(0, 2).toString("latin1") !== "PK") {
    throw new GalatPengguna("Unggah berkas Excel (.xlsx), CSV, atau JSON.");
  }
  try {
    await wb.xlsx.load(isi as unknown as ArrayBuffer);
  } catch {
    throw new GalatPengguna("Berkas Excel tidak dapat dibaca.");
  }
  return barisDariSheet(wb.worksheets[0]);
}

/** Unggah berkas → pratinjau hasil pengurai One Data: `{ success, message, result }` seperti kode asal. */
export async function pratinjauImpor(p: Pengguna, prodiId: string, berkas: { nama: string; isi: Buffer } | null, domain: string | null) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  if (!berkas) throw new GalatPengguna("File tidak ditemukan.");
  if (berkas.isi.length > UKURAN_MAKS_IMPOR) throw new GalatPengguna("Ukuran berkas melebihi batas 10MB.");
  const rawRows = await bacaBarisBerkas(berkas.nama, berkas.isi);
  if (rawRows.length === 0) throw new GalatPengguna("File kosong atau format baris tidak dikenali");
  const d = domain || "auto";
  const r0 = rawRows[0];
  let result;
  if (d === "sdm" || "nidn" in r0 || "nm_sdm" in r0 || "nama_sdm" in r0) result = parseOneDataSDM(rawRows);
  else if (d === "mahasiswa" || "pendaftar" in r0 || "tahun_akademik" in r0) result = parseOneDataMahasiswa(rawRows);
  else if (d === "kerjasama" || "lembaga_mitra" in r0 || "mitra" in r0) result = parseOneDataKerjasama(rawRows);
  else if (d === "tracer" || "waktu_tunggu_bulan" in r0 || "kesesuaian_tinggi" in r0) result = parseOneDataTracer(rawRows);
  else result = parseOneDataSDM(rawRows);
  return { success: true, message: "Ekstraksi One Data berhasil", result };
}

const skemaTerapkan = z.object({
  action: z.literal("apply", { error: "Aksi atau data tidak valid" }),
  domain: z.string().max(100).default(""),
  items: z.array(z.record(z.string(), z.unknown())).min(1, "Aksi atau data tidak valid").max(BARIS_MAKS_IMPOR),
});

const teksAtau = (v: unknown, cadangan: string) => (typeof v === "string" && v.trim() ? v.trim() : v != null && v !== "" ? String(v) : cadangan);
const nomor = (v: unknown, cadangan = 0) => {
  const n = Number(v ?? cadangan);
  return Number.isFinite(n) ? n : cadangan;
};

/** JSON `{ action: "apply", domain, items }` → simpan ke tabel LKPS prodi aktif. */
export async function terapkanImpor(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { domain, items } = skemaTerapkan.parse(masukan);
  let insertedCount = 0;
  await prisma.$transaction(async (tx) => {
    if (domain.includes("SDM") || domain.includes("Dosen")) {
      for (const item of items) {
        const nidn = item.nidn && item.nidn !== "-" ? String(item.nidn) : `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const pendidikan = typeof item.pendidikan === "string" ? item.pendidikan : "";
        const isi = {
          nama: teksAtau(item.nama, "Tanpa nama"),
          jabatanAkademik: teksAtau(item.jabatanAkademik, "Lektor"),
          bidangKeahlian: typeof item.bidangKeahlian === "string" ? item.bidangKeahlian : null,
          pendidikanS2: pendidikan.includes("S2"),
          pendidikanS3: pendidikan.includes("S3"),
          mataKuliahDiampu: typeof item.mataKuliahDiampu === "string" ? item.mataKuliahDiampu : null,
          kesesuaianBidang: typeof item.kesesuaianKompetensi === "boolean" ? item.kesesuaianKompetensi : true,
          sertifikasiDosen: typeof item.sertifikatPendidik === "boolean" ? item.sertifikatPendidik : true,
          sertifikasiKompetensi: typeof item.sertifikatProfesi === "boolean" ? item.sertifikatProfesi : false,
        };
        await tx.lkpsDosenTetap.upsert({
          where: { prodiId_nidn: { prodiId, nidn } },
          update: isi,
          create: { nidn, ...isi, prodiId },
        });
        insertedCount++;
      }
    } else if (domain.includes("Mahasiswa") || domain.includes("PMB")) {
      for (const item of items) {
        await tx.lkpsSeleksiMahasiswaBaru.create({
          data: {
            tahunSemester: teksAtau(item.tahunAkademik, "TS"),
            dayaTampung: nomor(item.dayaTampung),
            jumlahPendaftar: nomor(item.pendaftar),
            jumlahLulusSeleksi: nomor(item.lulusSeleksi),
            mahasiswaBaruReguler: nomor(item.mhsBaruReguler),
            mahasiswaBaruTransfer: nomor(item.mhsBaruTransfer),
            mahasiswaAktifReguler: nomor(item.mhsAktifReguler),
            mahasiswaAktifTransfer: nomor(item.mhsAktifTransfer),
            prodiId,
          },
        });
        insertedCount++;
      }
    } else if (domain.includes("Kerjasama") || domain.includes("LP2M")) {
      for (const [i, item] of items.entries()) {
        const mulai = tanggal(`Tanggal mulai kerja sama baris ${i + 1}`).safeParse(item.tanggalMulai);
        const akhir = tanggal(`Tanggal akhir kerja sama baris ${i + 1}`).safeParse(item.tanggalAkhir);
        if (!mulai.success || !akhir.success) {
          throw new GalatPengguna(
            `Baris ${i + 1}: tanggal mulai dan akhir kerja sama tidak ada di berkas impor. Tambahkan kolom tanggal, atau isi kerja sama di halaman Kerjasama.`,
          );
        }
        const jns = item.bidang === "Penelitian" ? "N2" : item.bidang === "Pengabdian" ? "N3" : "N1";
        await tx.lkpsKerjasama.create({
          data: {
            namaLembaga: teksAtau(item.lembagaMitra, "Mitra Universitas"),
            tingkat: teksAtau(item.tingkat, "Nasional"),
            judulKegiatan: teksAtau(item.judulKegiatan, "Kerjasama Tridharma"),
            manfaat: teksAtau(item.manfaat, "Peningkatan kapasitas prodi"),
            tanggalMulai: mulai.data,
            tanggalAkhir: akhir.data,
            jenisKerjasama: jns,
            prodiId,
          },
        });
        insertedCount++;
      }
    } else if (domain.includes("Tracer")) {
      for (const item of items) {
        const t = nomor(item.tahun, NaN);
        if (!Number.isInteger(t)) throw new GalatPengguna("Tahun tracer study wajib diisi di berkas impor.");
        await tx.lkpsTracerStudy.create({
          data: {
            tahun: t,
            jumlahResponden: nomor(item.responden, 100),
            rataWaktuTunggu: nomor(item.waktuTungguBulan, 4.0),
            persenSesuaiBidang: nomor(item.kesesuaianBidangPersen, 80),
            persenTempatKerjaLokal: 30,
            persenTempatKerjaNasional: 60,
            persenTempatKerjaInternasional: 10,
            skorKepuasanPengguna: 3.5,
            prodiId,
          },
        });
        insertedCount++;
      }
    } else {
      throw new GalatPengguna("Aksi atau data tidak valid");
    }
  });
  return { success: true, message: `Berhasil menerapkan ${insertedCount} data ke basis data LKPS`, insertedCount };
}
