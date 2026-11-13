import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, pastikanAdmin, pastikanPeran, type Pengguna } from "@/modules/bersama/akses";
import { modelEmbeddingAktif, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { ambilProyek } from "@/modules/led/data/proyek";
import { jalankanJalur, jalankanUnsur, kueriSubBagian, kueriUnsurSubBagian, type LingkupCari } from "@/modules/led/data/pencarian";
import {
  KONFIGURASI_PENCARIAN, konfigurasiAktif, type JejakPencarian, type KodeKonfigurasi,
} from "@/modules/led/domain/konfigurasi-pencarian";
import { susunPool, type JalurKonfigurasi } from "@/modules/led/domain/pool-pencarian";
import { urutanSistemUnsur } from "@/modules/led/domain/kueri-unsur";
import { tulisCsv } from "@/modules/led/domain/csv";

/**
 * Rencana 10 Nov T2: ekspor data uji pencarian untuk pelabelan manusia (rumusan masalah 2).
 * - Per sub-bagian yang sudah punya draf: kueri tersimpan di versi aktif (atau kueri generate bila versi lama belum
 *   menyimpan jejak) dijalankan ulang untuk setiap konfigurasi yang aktif; pool = 20 teratas setiap jalur + k teratas
 *   gabungan, tanpa duplikat (domain/pool-pencarian.ts).
 * - Satu-satunya panggilan AI adalah embedding kueri (satu kali per kueri per model, dipakai semua konfigurasi yang
 *   memakai kolom vektor yang sama). Label tidak pernah dibuat sistem: kolom relevan dan catatan dikosongkan.
 * - Tim Prodi hanya LED prodinya; Admin UPPS satu LED atau semua LED.
 */

export const KEPALA_CSV_UJI = [
  "led", "led_id", "sub_bagian", "judul_sub_bagian", "butir", "unsur", "kueri", "potongan_id", "dokumen", "halaman",
  "peringkat_per_konfigurasi", "masuk_konteks", "cuplikan", "relevan", "catatan",
];

const N_POOL = 20;
const N_KANDIDAT = 30;

function cuplikan(teks: string): string {
  const t = teks.replace(/\s+/g, " ").trim();
  return t.length > 300 ? `${t.slice(0, 299)}…` : t;
}

/** Peringkat per konfigurasi dalam bentuk ringkas: {"A-lama":{"v":3,"k":null,"g":2}} */
function peringkatRingkas(p: Record<string, { v: number | null; kk: number | null; g: number | null }>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(p).map(([konf, x]) => [konf, { v: x.v, k: x.kk, g: x.g }])));
}

async function proyekYangDiekspor(p: Pengguna, proyekId: string | null) {
  pastikanPeran(p, "ADMIN", "TIM_PRODI");
  if (proyekId) return [await ambilProyek(p, proyekId, { baca: true })];
  pastikanAdmin(p);
  return prisma.proyekLED.findMany({ orderBy: [{ prodi: { nama: "asc" } }, { tahunPengajuan: "desc" }], include: { prodi: true } });
}

export interface HasilEksporUji {
  csv: string;
  namaBerkas: string;
  jumlahSubBagian: number;
  jumlahBaris: number;
}

export async function eksporDataUjiPencarian(p: Pengguna, proyekId: string | null): Promise<HasilEksporUji> {
  const daftarProyek = await proyekYangDiekspor(p, proyekId);
  const model = await modelEmbeddingAktif();
  const konfigurasi = konfigurasiAktif();
  const vektorCache = new Map<string, Promise<number[]>>();
  let penyedia: Awaited<ReturnType<typeof penyediaEmbedding>>["penyedia"] | null = null;
  const vektorKueri = (kueri: string) => async () => {
    if (!vektorCache.has(kueri)) {
      vektorCache.set(kueri, (async () => {
        penyedia ??= (await penyediaEmbedding()).penyedia;
        return penyedia.embedKueri(kueri);
      })());
    }
    return vektorCache.get(kueri)!;
  };

  const baris: unknown[][] = [];
  let jumlahSubBagian = 0;
  for (const proyek of daftarProyek) {
    const draf = await prisma.bagianDraf.findMany({
      where: { proyekId: proyek.id, versiAktifId: { not: null } },
      include: {
        subBagian: { include: { butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: { select: { kode: true, urutan: true } } } } } },
      },
      orderBy: { subBagian: { urutan: "asc" } },
    });
    const versi = new Map((await prisma.versiDraf.findMany({
      where: { id: { in: draf.map((d) => d.versiAktifId!) } },
      select: { id: true, pencarian: true },
    })).map((v) => [v.id, v.pencarian as unknown as JejakPencarian | null]));
    for (const d of draf) {
      const sub = d.subBagian;
      const jejak = versi.get(d.versiAktifId!) ?? null;
      const kueri = jejak?.kueri?.[0] ?? (await kueriSubBagian(p, proyek.id, sub.kode));
      const lingkup: LingkupCari = { proyekId: proyek.id, subBagianKode: sub.kode, model };
      const perKonfigurasi: Record<string, JalurKonfigurasi> = {};
      const unsurAsal = new Map<string, string>();
      for (const konf of konfigurasi) {
        if (KONFIGURASI_PENCARIAN[konf].kueri === "unsur") {
          // C-unsur: kueri umum + per unsur dari instrumen; jalur = gabungan kandidat semua kueri (peringkat terbaik)
          const kueriUnsur = await kueriUnsurSubBagian(proyek.id, sub.kode);
          const u = await jalankanUnsur(lingkup, kueriUnsur, { k: KONFIGURASI_PENCARIAN[konf].k, kandidat: N_KANDIDAT });
          const terbaik = (jalur: "vektor" | "kataKunci") => {
            const posisi = new Map<string, number>();
            for (const h of u.hasilKueri) h[jalur].forEach((id, i) => posisi.set(id, Math.min(posisi.get(id) ?? Infinity, i)));
            return [...posisi.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([id]) => id);
          };
          perKonfigurasi[konf] = { vektor: terbaik("vektor"), kataKunci: terbaik("kataKunci"), k: u.pilih.terpilih.length, gabungan: urutanSistemUnsur(u.pilih) };
          const teksUnsur = new Map(kueriUnsur.map((q) => [q.kunci, q.unsur ?? ""]));
          for (const t of u.pilih.terpilih) unsurAsal.set(t.id, teksUnsur.get(t.asal) ?? "");
          continue;
        }
        const j = await jalankanJalur(lingkup, konf, kueri, N_KANDIDAT, vektorKueri(kueri));
        perKonfigurasi[konf] = { vektor: j.vektor, kataKunci: j.kataKunci, k: KONFIGURASI_PENCARIAN[konf].k };
      }
      const pool = susunPool(perKonfigurasi, N_POOL);
      if (pool.length === 0) continue;
      jumlahSubBagian++;
      const potongan = new Map((await prisma.potongan.findMany({
        where: { id: { in: pool.map((x) => x.potonganId) } },
        select: { id: true, teks: true, halaman: true, dokumen: { select: { judul: true, namaBerkas: true } } },
      })).map((x) => [x.id, x]));
      // masuk konteks: dari jejak versi aktif; versi lama tanpa jejak memakai k teratas konfigurasi A (perkiraan)
      const dipakai = new Set(jejak ? jejak.kandidat.filter((c) => c.masukKonteks).map((c) => c.potonganId) : []);
      const butir = sub.butir.map((r) => r.butir).sort((a, b) => a.urutan - b.urutan).map((b) => b.kode).join("; ");
      for (const x of pool) {
        const pt = potongan.get(x.potonganId);
        if (!pt) continue;
        const masuk = jejak ? dipakai.has(x.potonganId) : (x.peringkat["A-lama"]?.g ?? Infinity) <= KONFIGURASI_PENCARIAN["A-lama"].k;
        baris.push([
          proyek.nama, proyek.id, sub.kode, sub.judul, butir, unsurAsal.get(x.potonganId) ?? "", kueri, x.potonganId, pt.dokumen.judul ?? pt.dokumen.namaBerkas,
          pt.halaman ?? "", peringkatRingkas(x.peringkat), masuk ? 1 : 0, cuplikan(pt.teks), "", "",
        ]);
      }
    }
  }
  if (jumlahSubBagian === 0) throw new GalatPengguna("Belum ada sub-bagian berdraf yang punya potongan dokumen untuk diuji.");
  const nama = proyekId ? daftarProyek[0].nama : "semua-LED";
  return {
    // BOM supaya Excel membaca UTF-8
    csv: "﻿" + tulisCsv(KEPALA_CSV_UJI, baris),
    namaBerkas: `data-uji-pencarian-${nama.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.csv`,
    jumlahSubBagian,
    jumlahBaris: baris.length,
  };
}

export type { KodeKonfigurasi };
