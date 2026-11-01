import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { AKTIF } from "@/modules/bersama/data/organisasi";
import { beritahu } from "@/modules/bersama/data/pemberitahuan";
import {
  acuanPeriode, ambangPengingat, LABEL_STATUS_AKUN, perluLedBaru, pesanPengingat, riwayatBerlakuTerbaru, statusAkunProdi,
  type Ambang, type StatusAkunProdi,
} from "@/modules/bersama/domain/akreditasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";

/**
 * Pengingat akreditasi berakhir (L2, 2 Nov 2026). Pekerjaan harian "pengingat-akreditasi" mengirim pemberitahuan
 * lonceng 18, 12, dan 6 bulan sebelum akreditasi prodi berakhir, sekali per ambang, ke semua akun Tim Prodi aktif prodi
 * itu dan ke Admin UPPS, selama prodi belum punya LED aktif untuk periode berikutnya.
 */

export interface StatusPeriode {
  prodiId: string;
  nama: string;
  berlakuSampai: Date | null;
  ambang: Ambang | null;
  perluLedBaru: boolean;
  /** L3: akun Tim Prodi prodi ini beserta login terakhir */
  akun: { id: string; nama: string; email: string; aktif: boolean; loginTerakhir: Date | null }[];
  statusAkun: StatusAkunProdi;
}

/** Status periode semua prodi (dipakai pekerjaan harian dan Pantau LED). */
export async function statusPeriodeProdi(hariIni = new Date()): Promise<StatusPeriode[]> {
  const prodi = await prisma.prodi.findMany({
    include: {
      riwayatAkreditasi: { where: { status: "berlaku" } },
      proyek: { select: { createdAt: true, diarsipkanPada: true } },
      anggota: { where: { role: "TIM_PRODI" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, banned: true, loginTerakhir: true, createdAt: true } },
    },
  });
  return prodi.map((x) => {
    const r = riwayatBerlakuTerbaru(x.riwayatAkreditasi);
    const berlakuSampai = x.akreditasiBerlakuSampai;
    const acuan = r ? acuanPeriode(r) : acuanPeriode({ tanggalSk: null, berlakuMulai: null, berlakuSampai });
    return {
      prodiId: x.id,
      nama: `${namaJenjang(x.jenjang)} ${x.nama}`,
      berlakuSampai,
      ambang: ambangPengingat(berlakuSampai, hariIni),
      perluLedBaru: perluLedBaru({ berlakuSampai, acuan, led: x.proyek }, hariIni),
      akun: x.anggota.map((a) => ({ id: a.id, nama: a.name, email: a.email, aktif: !a.banned, loginTerakhir: a.loginTerakhir })),
      statusAkun: statusAkunProdi(x.anggota.map((a) => ({ aktif: !a.banned, loginTerakhir: a.loginTerakhir, dibuat: a.createdAt })), hariIni),
    };
  });
}

async function penerima(prodiId: string) {
  const [tim, admin] = await Promise.all([
    prisma.user.findMany({ where: { role: "TIM_PRODI", prodiId, ...AKTIF }, select: { id: true } }),
    prisma.user.findMany({ where: { role: "ADMIN", ...AKTIF }, select: { id: true } }),
  ]);
  return { tim: tim.map((u) => u.id), admin: admin.map((u) => u.id) };
}

async function kirim(s: StatusPeriode, hariIni: Date) {
  const pesan = pesanPengingat(s.nama, s.berlakuSampai!, hariIni);
  const { tim, admin } = await penerima(s.prodiId);
  await beritahu(tim, { pesan, tautan: "/led" });
  // L3: Admin UPPS sekaligus diingatkan memeriksa akun Tim Prodi prodi itu
  const akun = LABEL_STATUS_AKUN[s.statusAkun];
  await beritahu(admin, { pesan: akun ? `${pesan} ${akun}.` : pesan, tautan: "/dashboard" });
}

/** Pekerjaan harian: kirim pengingat untuk ambang yang baru tercapai. Mengembalikan jumlah prodi yang diingatkan. */
export async function kirimPengingatAkreditasi(hariIni = new Date(), opsi: { prodiId?: string } = {}): Promise<number> {
  let n = 0;
  for (const s of await statusPeriodeProdi(hariIni)) {
    if (opsi.prodiId && s.prodiId !== opsi.prodiId) continue;
    if (!s.perluLedBaru || !s.ambang || !s.berlakuSampai) continue;
    const kunci = { prodiId: s.prodiId, berlakuSampai: s.berlakuSampai, ambang: s.ambang };
    if (await prisma.pengingatTerkirim.findUnique({ where: { prodiId_berlakuSampai_ambang: kunci } })) continue;
    await prisma.pengingatTerkirim.create({ data: kunci });
    await kirim(s, hariIni);
    n++;
  }
  return n;
}

/** Pantau LED: Admin UPPS mengingatkan Tim Prodi satu prodi sekarang juga (di luar jadwal harian). */
export async function ingatkanTimProdi(p: Pengguna, prodiId: string, hariIni = new Date()) {
  pastikanAdmin(p);
  const prodi = await prisma.prodi.findUnique({ where: { id: prodiId } });
  if (!prodi) throw new GalatPengguna("Program studi tidak ditemukan.");
  if (!prodi.akreditasiBerlakuSampai) throw new GalatPengguna("Tanggal akreditasi berakhir prodi ini belum tercatat.");
  const { tim } = await penerima(prodiId);
  if (!tim.length) throw new GalatPengguna("Prodi ini belum punya akun Tim Prodi aktif. Tambahkan dulu di Kelola akun.");
  await beritahu(tim, { pesan: pesanPengingat(`${namaJenjang(prodi.jenjang)} ${prodi.nama}`, prodi.akreditasiBerlakuSampai, hariIni), tautan: "/led" });
  await catatAktivitas(p, "ingatkan_tim_prodi", "prodi", prodiId, { penerima: tim.length });
  return tim.length;
}
