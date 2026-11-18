import { z } from "zod";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { idSmsProdi } from "@/modules/lkps/domain/onedata-prodi";
import { ambilOneData } from "@/modules/lkps/data/onedata/klien";
import { PESAN_ONEDATA_MATI, statusOneData, type KonfigurasiOneData } from "@/modules/lkps/data/onedata/konfigurasi";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/onedata/sync/route.ts.
// Gabung LKPS G6: endpoint, pemetaan kolom, dan nilai pengisi diambil dari kode asal; perbedaannya:
// - mati secara bawaan (LKPS_ONEDATA_AKTIF) → GalatOneDataMati (rute: 503 "Sinkron One Data belum diaktifkan");
// - hanya Tim Prodi untuk prodinya (kode asal: siapa pun yang login; prodi ditebak dari nama akun, cadangan
//   "S1 Arsitektur"); semua tulis/hapus dibatasi prodi aktif (kode asal: deleteMany tanpa prodi bila prodi kosong);
// - data yang ada hanya diganti bila One Data mengembalikan baris (kode asal mengosongkan kerja sama dan mata kuliah
//   walau hasil One Data kosong);
// - blok yang mengarang data dibuang: seleksi mahasiswa baru contoh (5 kohort angka tetap), 4 penelitian/PkM contoh,
//   penghapusan penelitian lintas prodi menurut nama dosen contoh, persentase tempat kerja 30/60/10 dan skor kepuasan
//   3,7 di tracer (diisi 0, dilengkapi manual), cadangan 85% dan 3,2 bulan; tahun tracer = tahun berjalan (asal 2024);
// - NIDN kosong: kunci `UNILA-SDM-<id_sdm>` tanpa angka acak (baris tanpa id_sdm dilewati); kode MK kosong dilewati;
//   `fileMou` tidak diisi (kode asal menulis nama PDF yang tidak ada di penyimpanan).

export class GalatOneDataMati extends Error {
  constructor() {
    super(PESAN_ONEDATA_MATI);
    this.name = "GalatOneDataMati";
  }
}

const skemaSinkron = z
  .object({ domain: z.enum(["all", "sdm", "kerjasama", "pendidikan", "tracer", "prestasi", "luaran", "mahasiswa"]).default("all") })
  .default({ domain: "all" });

type Baris = Record<string, unknown>;

function teks(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s && s !== "-" ? s : null;
}

/** Baris `data` dari setiap id_sms prodi digabung (kode asal: satu permintaan per id_sms, limit 100). */
async function barisPerProdi(k: KonfigurasiOneData, endpoint: string, idSms: readonly string[]): Promise<Baris[]> {
  const hasil: Baris[] = [];
  for (const id of idSms) {
    const res = (await ambilOneData(k, endpoint, { id_sms: id, limit: 100 })) as { data?: unknown };
    if (Array.isArray(res?.data)) hasil.push(...(res.data as Baris[]));
  }
  return hasil;
}

export interface HasilSinkron {
  success: true;
  message: string;
  prodi: string;
  prodiId: string;
  id_sms_unila: readonly string[];
  sumber: string;
  waktuSinkronisasi: string;
  details: Record<string, string>;
  stats: Record<string, number>;
}

/** POST `/api/lkps/onedata/sinkron` `{ domain }` → hasil per domain (bentuk respons sama dengan kode asal). */
export async function sinkronOneData(p: Pengguna, prodiId: string, masukan: unknown): Promise<HasilSinkron> {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const status = statusOneData();
  if (!status.aktif) throw new GalatOneDataMati();
  const k = status.konfigurasi;
  const { domain } = skemaSinkron.parse(masukan ?? {});
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id: prodiId }, select: { nama: true } });
  const namaProdi = prodi.nama;
  const idSms = idSmsProdi(namaProdi);
  if (!idSms.length) throw new GalatPengguna(`Program studi ${namaProdi} belum dipetakan ke id_sms myUnila.`);
  const ikut = (...d: string[]) => domain === "all" || d.includes(domain);
  const hasil: HasilSinkron = {
    success: true,
    message: "",
    prodi: namaProdi,
    prodiId,
    id_sms_unila: idSms,
    sumber: "One Data UNILA (myUnila WS API)",
    waktuSinkronisasi: new Date().toISOString(),
    details: {},
    stats: {},
  };
  const catatGalat = (kunci: string, e: unknown) => {
    hasil.details[kunci] = `Gagal: ${e instanceof Error ? e.message : "galat tidak dikenal"}`;
  };

  // 1. Dosen tetap (Kriteria 3)
  if (ikut("sdm")) {
    try {
      let baris = await barisPerProdi(k, "/v1/sdm/penugasan_sdm", idSms);
      if (!baris.length) {
        const res = (await ambilOneData(k, "/v1/sdm/list_sdm", { limit: 50 })) as { data?: unknown };
        if (Array.isArray(res?.data)) baris = res.data as Baris[];
      }
      const dilihat = new Set<string>();
      let n = 0;
      for (const s of baris) {
        const nama = teks(s.nm_sdm);
        const idSdm = teks(s.id_sdm);
        const nidn = teks(s.nidn) ?? (idSdm ? `UNILA-SDM-${idSdm}` : null);
        if (!nama || !nidn || dilihat.has(nidn)) continue;
        dilihat.add(nidn);
        const jabatanAkademik = s.nm_stat_pegawai === "PNS" ? "Lektor" : "Asisten Ahli";
        const doktor = nama.toLowerCase().includes("dr.");
        await prisma.lkpsDosenTetap.upsert({
          where: { prodiId_nidn: { prodiId, nidn } },
          update: { nama, jabatanAkademik, kesesuaianBidang: true, kesesuaianKompetensi: true, sertifikasiDosen: true },
          create: {
            nidn,
            nama,
            pendidikanS2: true,
            pendidikanS3: doktor || nama.toLowerCase().includes("prof."),
            prodiPascaS2: `Magister ${namaProdi}`,
            prodiPascaS3: doktor ? `Doktor ${namaProdi}` : null,
            jabatanAkademik,
            bidangKeahlian: namaProdi,
            mataKuliahDiampu: `Mata Kuliah Keahlian ${namaProdi}`,
            kesesuaianBidang: true,
            kesesuaianKompetensi: true,
            sertifikasiDosen: true,
            sertifikasiKompetensi: false,
            prodiId,
          },
        });
        n++;
      }
      hasil.details.sdm = `${n} dosen tetap ${namaProdi} disinkronkan`;
      hasil.stats.sdm = n;
    } catch (e) {
      catatGalat("sdm", e);
    }
  }

  // 2. Publikasi dosen (Kriteria 3.b); kode asal tanpa saringan id_sms
  if (ikut("sdm", "luaran")) {
    try {
      const res = (await ambilOneData(k, "/v1/penelitian/publikasi", { limit: 50 })) as { data?: unknown };
      const baris = Array.isArray(res?.data) ? (res.data as Baris[]) : [];
      let n = 0;
      for (const b of baris) {
        const judul = teks(b.judul);
        if (!judul) continue;
        const terbit = teks(b.tgl_terbit) ? new Date(String(b.tgl_terbit)).getFullYear() : NaN;
        const detail = [
          teks(b.nama_jurnal) ? `Jurnal: ${teks(b.nama_jurnal)}` : null,
          teks(b.vol) ? `Vol ${teks(b.vol)} No ${teks(b.no) ?? 1}` : null,
          teks(b.doi) ? `DOI: ${teks(b.doi)}` : null,
        ].filter(Boolean).join(", ");
        const ada = await prisma.lkpsLuaranDosen.findFirst({ where: { judul, prodiId }, select: { id: true } });
        if (ada) continue;
        await prisma.lkpsLuaranDosen.create({
          data: {
            judul,
            jenis: teks(b.nm_jns_pub) ?? "Jurnal Internasional Bereputasi",
            tahun: Number.isNaN(terbit) ? 2024 : terbit,
            detail: detail || teks(b.url) || "-",
            namaDosen: teks(b.penerbit) ?? "Dosen Peneliti",
            prodiId,
          },
        });
        n++;
      }
      hasil.details.publikasi = `${n} publikasi baru disinkronkan`;
      hasil.stats.publikasi = n;
    } catch (e) {
      catatGalat("publikasi", e);
    }
  }

  // 3. Kerja sama (Kriteria 1)
  if (ikut("kerjasama")) {
    try {
      const baris = await barisPerProdi(k, "/v1/kerjasama/sms_kerjasama", idSms);
      const data = baris.flatMap((b) => {
        const judul = teks(b.judul_mou);
        if (!judul) return [];
        const kecil = judul.toLowerCase();
        const jenisKerjasama = kecil.includes("pengabdian") || kecil.includes("pkm") ? "N3" : kecil.includes("penelitian") || kecil.includes("riset") ? "N2" : "N1";
        return [{
          namaLembaga: teks(b.nm_sms) ?? `Mitra Kerjasama ${namaProdi}`,
          tingkat: teks(b.nm_tingkat_kerjasama) ?? "Nasional",
          judulKegiatan: judul,
          manfaat: `Penguatan keilmuan dan praktik profesi ${namaProdi}`,
          tanggalMulai: teks(b.create_date) ? new Date(String(b.create_date)) : new Date(),
          tanggalAkhir: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000),
          jenisKerjasama,
          prodiId,
        }];
      });
      if (data.length) {
        await prisma.$transaction([
          prisma.lkpsKerjasama.deleteMany({ where: { prodiId } }),
          prisma.lkpsKerjasama.createMany({ data }),
        ]);
      }
      hasil.details.kerjasama = data.length ? `${data.length} kerja sama ${namaProdi} disinkronkan` : "One Data tidak mengembalikan kerja sama; data lama tidak diubah";
      hasil.stats.kerjasama = data.length;
    } catch (e) {
      catatGalat("kerjasama", e);
    }
  }

  // 4. Mata kuliah (Kriteria 5)
  if (ikut("pendidikan")) {
    try {
      const baris = await barisPerProdi(k, "/v1/akademik/list_matkul", idSms);
      const dilihat = new Set<string>();
      const data = baris.flatMap((m) => {
        const nama = teks(m.nm_mk);
        const kode = teks(m.kode_mk);
        if (!nama || !kode || dilihat.has(kode)) return [];
        dilihat.add(kode);
        return [{
          kode,
          nama,
          sksTeori: Number(m.sks_tm ?? m.sks_mk ?? 2) || 0,
          sksPraktikum: Number(m.sks_prak ?? 0) || 0,
          cpl: `CPL Sikap, Pengetahuan, Keterampilan Perancangan ${namaProdi}`,
          unitPenyelenggara: namaProdi,
          prodiId,
        }];
      });
      if (data.length) {
        await prisma.$transaction([
          prisma.lkpsMataKuliah.deleteMany({ where: { prodiId } }),
          prisma.lkpsMataKuliah.createMany({ data }),
        ]);
      }
      hasil.details.pendidikan = data.length ? `${data.length} mata kuliah ${namaProdi} disinkronkan` : "One Data tidak mengembalikan mata kuliah; data lama tidak diubah";
      hasil.stats.pendidikan = data.length;
    } catch (e) {
      catatGalat("pendidikan", e);
    }
  }

  // 5. Tracer study (Kriteria 8): hanya angka yang dihitung dari One Data
  if (ikut("tracer")) {
    try {
      const baris = await barisPerProdi(k, "/v1/tracer/hasil_tracer", idSms);
      if (baris.length) {
        const waktu = baris.map((t) => Number(t.wkt_tunggu)).filter((v, i) => baris[i].wkt_tunggu !== null && !Number.isNaN(v));
        const rata = waktu.length ? waktu.reduce((a, b) => a + b, 0) / waktu.length : 0;
        const sesuai = baris.filter((t) => Number(t.tkt_kesesuaian) >= 2 || Number(t.hub_bidang_kerja) >= 2).length;
        await prisma.$transaction([
          prisma.lkpsTracerStudy.deleteMany({ where: { prodiId } }),
          prisma.lkpsTracerStudy.create({
            data: {
              tahun: new Date().getFullYear(),
              jumlahResponden: baris.length,
              rataWaktuTunggu: Number(rata.toFixed(1)),
              persenSesuaiBidang: Math.round((sesuai / baris.length) * 100),
              prodiId,
            },
          }),
        ]);
        hasil.details.tracer = `${baris.length} responden tracer ${namaProdi}; tempat kerja dan kepuasan pengguna diisi manual`;
        hasil.stats.tracer = baris.length;
      }
    } catch (e) {
      catatGalat("tracer", e);
    }
  }

  // 6. Prestasi mahasiswa (Kriteria 8)
  if (ikut("prestasi", "mahasiswa")) {
    try {
      const baris = await barisPerProdi(k, "/v1/kontribusi/list_prestasi", idSms);
      const data = baris.flatMap((b) => {
        const namaKegiatan = teks(b.nm_prestasi);
        if (!namaKegiatan) return [];
        return [{
          namaMahasiswa: teks(b.nm_pd) ?? `Mahasiswa ${namaProdi}`,
          namaKegiatan,
          tingkat: teks(b.nm_tkt_prestasi) ?? "Nasional",
          penghargaan: `Juara ${teks(b.peringkat) ?? 1}`,
          tahun: Number(b.thn_prestasi) || 2024,
          jenis: teks(b.nm_jenis_prestasi) ?? "Akademik",
          prodiId,
        }];
      });
      if (data.length) {
        await prisma.$transaction([
          prisma.lkpsPrestasiMahasiswa.deleteMany({ where: { prodiId } }),
          prisma.lkpsPrestasiMahasiswa.createMany({ data }),
        ]);
        hasil.details.prestasi = `${data.length} prestasi mahasiswa ${namaProdi} disinkronkan`;
        hasil.stats.prestasi = data.length;
      }
    } catch (e) {
      catatGalat("prestasi", e);
    }
  }

  hasil.message = `Sinkronisasi One Data ${namaProdi} selesai`;
  return hasil;
}
