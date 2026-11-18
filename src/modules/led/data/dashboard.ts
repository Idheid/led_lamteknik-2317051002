import { prisma } from "@/modules/bersama/db";
import { pastikanAdmin, pastikanPeran, type Pengguna } from "@/modules/bersama/akses";
import { statusPeriodeProdi } from "@/modules/bersama/data/pengingat-akreditasi";
import { riwayatBerlakuTerbaru } from "@/modules/bersama/domain/akreditasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { kesiapanLed } from "@/modules/led/data/kesiapan";
import { penilaianProyek } from "@/modules/led/data/review";
import { syaratCatatHasil } from "@/modules/led/data/akreditasi";
import { masaBerlaku, persenLed, statusLpmpp } from "@/modules/led/domain/dashboard";

/**
 * Dashboard akreditasi Fakultas/UPPS (desain form 2, 2 Nov 2026): satu baris per prodi dengan lembaga dan peringkat
 * (riwayat akreditasi berlaku terbaru), masa berlaku dan hitung mundur, kelengkapan LKPS dan LED, simulasi asesor
 * (perkiraan nilai gabungan skor reviewer dan skor otomatis), status LPMPP, perlu LED baru, dan akun Tim Prodi.
 */
export async function dataDashboard(p: Pengguna, hariIni = new Date(), opsi: { prodiId?: string } = {}) {
  pastikanAdmin(p);
  return hitungDashboard(p, hariIni, opsi);
}

/**
 * Gabung LKPS G2 (= Rencana 18 Nov S2): dashboard hanya baca untuk Tamu. Data dihitung di server dengan pembaca
 * internal setara Admin UPPS, lalu hanya kolom aman yang dikembalikan: prodi, lembaga, peringkat, nomor SK, masa berlaku,
 * kelengkapan LKPS dan LED, simulasi nilai, status LPMPP, dan perlu LED baru. Daftar akun Tim Prodi (nama, email, login
 * terakhir), status akun, nama reviewer, jumlah catatan reviewer, izin catat hasil, dan id LED tidak pernah dikirim.
 */
export async function dataDashboardTamu(p: Pengguna, hariIni = new Date(), opsi: { prodiId?: string } = {}) {
  pastikanPeran(p, "TAMU", "ADMIN");
  const baris = await hitungDashboard(PEMBACA_INTERNAL, hariIni, opsi);
  return baris.map((b) => ({
    prodi: b.prodi,
    lembaga: b.lembaga,
    peringkat: b.peringkat,
    nomorSk: b.nomorSk,
    berlakuSampai: b.berlakuSampai,
    masa: b.masa,
    led: b.led ? { nama: b.led.nama, tahunPengajuan: b.led.tahunPengajuan } : null,
    lkpsPersen: b.lkpsPersen,
    ledPersen: b.ledPersen,
    simulasi: b.simulasi ? { total: b.simulasi.total, perkiraan: b.simulasi.perkiraan } : null,
    status: b.status,
    perluLedBaru: b.perluLedBaru,
  }));
}

export type BarisDashboardTamu = Awaited<ReturnType<typeof dataDashboardTamu>>[number];

/** Riwayat akreditasi satu prodi untuk Tamu (hanya baca; tanpa berkas SK dan catatan internal). */
export async function riwayatAkreditasiTamu(p: Pengguna, prodiId: string) {
  pastikanPeran(p, "TAMU", "ADMIN");
  return prisma.riwayatAkreditasi.findMany({
    where: { prodiId },
    orderBy: [{ berlakuSampai: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, peringkat: true, lembaga: true, nomorSk: true, berlakuSampai: true, status: true },
  });
}

/** Pembaca internal untuk menghitung dashboard Tamu di server (tidak pernah dipakai sebagai sesi). */
const PEMBACA_INTERNAL: Pengguna = { id: "sistem-dashboard", nama: "Sistem", email: "", peran: "ADMIN", prodiId: null };

async function hitungDashboard(p: Pengguna, hariIni: Date, opsi: { prodiId?: string }) {
  const [prodi, periode, riwayat, asesor] = await Promise.all([
    prisma.prodi.findMany({
      where: opsi.prodiId ? { id: opsi.prodiId } : {},
      orderBy: [{ akreditasiBerlakuSampai: { sort: "asc", nulls: "last" } }, { nama: "asc" }],
      include: { proyek: { orderBy: { createdAt: "desc" } } },
    }),
    statusPeriodeProdi(hariIni),
    prisma.riwayatAkreditasi.findMany({ where: { status: { in: ["berlaku", "menunggu"] } } }),
    prisma.user.findMany({ where: { role: "ASESOR" }, select: { id: true, name: true } }),
  ]);
  const per = new Map(periode.map((x) => [x.prodiId, x]));
  const namaAsesor = new Map(asesor.map((a) => [a.id, a.name]));
  return Promise.all(prodi.map(async (x) => {
    const r = riwayatBerlakuTerbaru(riwayat.filter((h) => h.prodiId === x.id));
    const ident = (x.identitas ?? {}) as Record<string, string | undefined>;
    const led = x.proyek.find((l) => !l.diarsipkanPada) ?? null;
    const terakhir = x.proyek[0] ?? null;
    const hasilLed = terakhir ? riwayat.find((h) => h.proyekId === terakhir.id) ?? null : null;
    const [kesiapan, nilai, final, syarat] = led
      ? await Promise.all([
        kesiapanLed(led.id, hariIni),
        penilaianProyek(p, led.id, { tanpaNarasi: true }),
        prisma.ekspor.count({ where: { proyekId: led.id, jenis: "final", status: "siap" } }),
        syaratCatatHasil(led),
      ])
      : [null, null, 0, null];
    const s = per.get(x.id);
    return {
      prodi: { id: x.id, nama: x.nama, jenjang: x.jenjang, namaJenjang: namaJenjang(x.jenjang), kodePddikti: x.kodePddikti },
      lembaga: r?.lembaga || ident.lembagaAkreditasi || "LAM Teknik",
      peringkat: r?.peringkat || ident.peringkatAkreditasi || null,
      nomorSk: r?.nomorSk ?? ident.nomorSkAkreditasi ?? null,
      berlakuSampai: x.akreditasiBerlakuSampai,
      masa: masaBerlaku(x.akreditasiBerlakuSampai, hariIni),
      led: led ? { id: led.id, nama: led.nama, tahunPengajuan: led.tahunPengajuan, asesor: led.asesorId ? namaAsesor.get(led.asesorId) ?? null : null } : null,
      lkpsPersen: kesiapan?.lkpsPersen ?? null,
      ledPersen: persenLed(kesiapan?.sub ?? null),
      simulasi: nilai?.rekap.dinilai
        ? { total: nilai.rekap.total, perkiraan: nilai.perkiraanGabungan?.status ?? null, dariReviewer: nilai.akhir.dinilai }
        : null,
      status: statusLpmpp({
        adaLed: Boolean(led), statusReview: led?.statusReview ?? null, eksporFinal: final > 0,
        hasil: hasilLed?.status === "menunggu" ? "menunggu" : hasilLed?.status === "berlaku" ? "berlaku" : null,
      }),
      bolehCatat: syarat?.boleh ?? false,
      perluLedBaru: s?.perluLedBaru ?? false,
      catatanTerbuka: kesiapan?.catatanTerbuka ?? 0,
      akun: s?.akun.filter((a) => a.aktif) ?? [],
      statusAkun: s?.statusAkun ?? "belum-ada",
    };
  }));
}

export type BarisDashboard = Awaited<ReturnType<typeof hitungDashboard>>[number];
