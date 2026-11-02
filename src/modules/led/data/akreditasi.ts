import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { AKTIF } from "@/modules/bersama/data/organisasi";
import { beritahu } from "@/modules/bersama/data/pemberitahuan";
import { terapkanRiwayatTerbaru } from "@/modules/bersama/data/akreditasi";
import { modelAiAktif } from "@/modules/bersama/data/pengaturan";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { bacaSk, labelArsipLed, samarkanAngkaPanjang, type UsulanSk } from "@/modules/bersama/domain/akreditasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { skemaHasilAkreditasi, type MasukanHasilAkreditasi } from "@/modules/bersama/validasi";
import { teksPerHalaman } from "@/modules/led/instrumen/pdf";
import { panggilTerstruktur } from "@/modules/led/proses/llm-narasi";
import { perkiraanToken } from "@/modules/led/domain/usulan-struktur";

/**
 * Catat hasil akreditasi (L1, 2 Nov 2026): sumber tanggal akreditasi berakhir. Admin UPPS mencatat langsung berlaku;
 * Tim Prodi mencatat untuk LED prodinya dan menunggu konfirmasi Admin UPPS. Setelah berlaku, data prodi diturunkan dari
 * riwayat dan LED yang diajukan diarsipkan dengan label "Diajukan {tahun} · {peringkat}".
 */

const UKURAN_SK = 20 * 1024 * 1024;
const GENERATE_AKTIF = ["antre", "berjalan", "tertunda"];

async function idAdminAktif(): Promise<string[]> {
  return (await prisma.user.findMany({ where: { role: "ADMIN", ...AKTIF }, select: { id: true } })).map((u) => u.id);
}

async function idTimProdiAktif(prodiId: string): Promise<string[]> {
  return (await prisma.user.findMany({ where: { role: "TIM_PRODI", prodiId, ...AKTIF }, select: { id: true } })).map((u) => u.id);
}

/** LED boleh dicatat hasilnya: belum diarsipkan, dan Layak diajukan atau sudah diekspor final. */
export async function syaratCatatHasil(proyek: { id: string; diarsipkanPada: Date | null; statusReview: string }) {
  if (proyek.diarsipkanPada) return { boleh: false, alasan: "LED ini sudah diarsipkan." };
  const sudah = await prisma.riwayatAkreditasi.findFirst({ where: { proyekId: proyek.id, status: { in: ["menunggu", "berlaku"] } } });
  if (sudah) return { boleh: false, alasan: sudah.status === "menunggu" ? "Hasil akreditasi LED ini menunggu konfirmasi Admin UPPS." : "Hasil akreditasi LED ini sudah dicatat." };
  const final = await prisma.ekspor.count({ where: { proyekId: proyek.id, jenis: "final", status: "siap" } });
  if (proyek.statusReview !== "layak" && final === 0) return { boleh: false, alasan: "LED belum Layak diajukan dan belum diekspor final." };
  return { boleh: true, alasan: null };
}

/** Ringkasan untuk Beranda LED: tombol Catat hasil akreditasi dan status catatan yang ada. */
export async function statusHasilAkreditasi(p: Pengguna, proyek: { id: string; prodiId: string; diarsipkanPada: Date | null; statusReview: string }) {
  if (p.peran === "TIM_PRODI" ? p.prodiId !== proyek.prodiId : p.peran !== "ADMIN") throw new GalatAkses();
  const [syarat, catatan] = await Promise.all([
    syaratCatatHasil(proyek),
    prisma.riwayatAkreditasi.findFirst({ where: { proyekId: proyek.id }, orderBy: { createdAt: "desc" } }),
  ]);
  return { ...syarat, catatan };
}

async function arsipkanLed(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], proyekId: string, peringkat: string) {
  const led = await tx.proyekLED.findUnique({ where: { id: proyekId } });
  if (!led || led.diarsipkanPada) return;
  const aktif = await tx.tugasGenerate.count({ where: { proyekId, status: { in: GENERATE_AKTIF } } });
  if (aktif) throw new GalatPengguna("Masih ada penyusunan berjalan di LED ini. Tunggu selesai atau batalkan dulu.");
  await tx.proyekLED.update({ where: { id: proyekId }, data: { diarsipkanPada: new Date(), labelArsip: labelArsipLed(led.tahunPengajuan, peringkat) } });
}

/**
 * Catat hasil akreditasi dari SK (dengan PDF SK opsional). Admin UPPS: semua prodi, langsung berlaku. Tim Prodi: hanya
 * LED prodinya yang memenuhi syarat, menunggu konfirmasi Admin UPPS.
 */
export async function catatHasilAkreditasi(p: Pengguna, masukan: MasukanHasilAkreditasi, berkas?: { nama: string; isi: Buffer } | null) {
  const data = skemaHasilAkreditasi.parse(masukan);
  const admin = p.peran === "ADMIN";
  if (!admin && !(p.peran === "TIM_PRODI" && p.prodiId === data.prodiId)) throw new GalatAkses("Hasil akreditasi hanya dicatat Admin UPPS atau Tim Prodi prodi itu.");
  if (!admin && !data.proyekId) throw new GalatPengguna("Tim Prodi mencatat hasil akreditasi dari LED yang diajukan.");
  const prodi = await prisma.prodi.findUnique({ where: { id: data.prodiId } });
  if (!prodi) throw new GalatPengguna("Program studi tidak ditemukan.");
  if (data.proyekId) {
    const led = await prisma.proyekLED.findUnique({ where: { id: data.proyekId } });
    if (!led || led.prodiId !== prodi.id) throw new GalatPengguna("LED tidak ditemukan di program studi ini.");
    const s = await syaratCatatHasil(led);
    if (!s.boleh) throw new GalatPengguna(s.alasan!);
  }
  if (berkas) {
    if (berkas.isi.length > UKURAN_SK) throw new GalatPengguna("PDF SK terlalu besar (maks. 20 MB).");
    if (berkas.isi.subarray(0, 5).toString("latin1") !== "%PDF-") throw new GalatPengguna("SK harus berupa berkas PDF.");
  }
  const simpan = berkas ? await simpanBerkas(`akreditasi/${prodi.id}`, berkas.nama, berkas.isi) : null;
  const tgl = (s: string | null) => (s ? new Date(`${s}T00:00:00.000Z`) : null);
  const r = await prisma.$transaction(async (tx) => {
    const baris = await tx.riwayatAkreditasi.create({
      data: {
        prodiId: prodi.id, lembaga: data.lembaga, peringkat: data.peringkat, nomorSk: data.nomorSk, tanggalSk: tgl(data.tanggalSk),
        berlakuMulai: tgl(data.berlakuMulai), berlakuSampai: tgl(data.berlakuSampai), proyekId: data.proyekId,
        berkasSkLokasi: simpan?.lokasi ?? null, berkasSkNama: berkas?.nama ?? null, jenis: "hasil",
        status: admin ? "berlaku" : "menunggu", dicatatOlehId: p.id,
        ...(admin ? { dikonfirmasiOlehId: p.id, dikonfirmasiPada: new Date() } : {}),
      },
    });
    if (admin) {
      await terapkanRiwayatTerbaru(tx, prodi.id);
      if (data.proyekId) await arsipkanLed(tx, data.proyekId, data.peringkat);
    }
    return baris;
  }).catch(async (e) => {
    // gagal di tengah: tidak ada yang tercatat, LED tidak diarsipkan, dan PDF SK yang sempat disimpan dihapus
    if (simpan) await hapusBerkas(simpan.lokasi).catch(() => undefined);
    throw e;
  });
  const nama = `${namaJenjang(prodi.jenjang)} ${prodi.nama}`;
  if (admin) {
    await beritahu(await idTimProdiAktif(prodi.id), {
      proyekId: data.proyekId, pesan: `Hasil akreditasi ${nama} dicatat: ${data.peringkat}, berlaku sampai ${data.berlakuSampai}.`, tautan: "/led",
    });
  } else {
    await beritahu(await idAdminAktif(), {
      proyekId: data.proyekId, pesan: `Tim Prodi ${nama} mencatat hasil akreditasi (${data.peringkat}). Periksa dan konfirmasi.`, tautan: `/pengaturan/prodi/${prodi.id}`,
    });
  }
  await catatAktivitas(p, "catat_hasil_akreditasi", "prodi", prodi.id, { riwayatId: r.id, peringkat: data.peringkat, berlakuSampai: data.berlakuSampai, status: r.status });
  return r;
}

/** Admin UPPS mengonfirmasi hasil yang dicatat Tim Prodi: data prodi diperbarui dan LED-nya diarsipkan. */
export async function konfirmasiHasilAkreditasi(p: Pengguna, riwayatId: string) {
  pastikanAdmin(p);
  const r = await prisma.riwayatAkreditasi.findUnique({ where: { id: riwayatId } });
  if (!r || r.status !== "menunggu") throw new GalatPengguna("Catatan ini tidak menunggu konfirmasi.");
  await prisma.$transaction(async (tx) => {
    await tx.riwayatAkreditasi.update({ where: { id: r.id }, data: { status: "berlaku", dikonfirmasiOlehId: p.id, dikonfirmasiPada: new Date() } });
    await terapkanRiwayatTerbaru(tx, r.prodiId);
    if (r.proyekId) await arsipkanLed(tx, r.proyekId, r.peringkat);
  });
  await beritahu([r.dicatatOlehId], { proyekId: r.proyekId, pesan: `Hasil akreditasi (${r.peringkat}) dikonfirmasi Admin UPPS.`, tautan: "/led" });
  await catatAktivitas(p, "konfirmasi_hasil_akreditasi", "prodi", r.prodiId, { riwayatId: r.id });
}

export async function tolakHasilAkreditasi(p: Pengguna, riwayatId: string, alasan: string) {
  pastikanAdmin(p);
  const teks = z.string().trim().min(3, "Isi alasan penolakan.").max(500).parse(alasan);
  const r = await prisma.riwayatAkreditasi.findUnique({ where: { id: riwayatId } });
  if (!r || r.status !== "menunggu") throw new GalatPengguna("Catatan ini tidak menunggu konfirmasi.");
  await prisma.riwayatAkreditasi.update({ where: { id: r.id }, data: { status: "ditolak", alasan: teks, dikonfirmasiOlehId: p.id, dikonfirmasiPada: new Date() } });
  await beritahu([r.dicatatOlehId], { proyekId: r.proyekId, pesan: `Hasil akreditasi yang dicatat ditolak Admin UPPS: ${teks}`, tautan: r.proyekId ? `/led/${r.proyekId}` : "/led" });
  await catatAktivitas(p, "tolak_hasil_akreditasi", "prodi", r.prodiId, { riwayatId: r.id, alasan: teks });
}

/** Berkas SK (Admin UPPS, atau Tim Prodi prodi itu). */
export async function berkasSkAkreditasi(p: Pengguna, riwayatId: string) {
  const r = await prisma.riwayatAkreditasi.findUnique({ where: { id: riwayatId } });
  if (!r) throw new GalatPengguna("Riwayat tidak ditemukan.");
  if (p.peran === "TIM_PRODI" ? p.prodiId !== r.prodiId : p.peran !== "ADMIN") throw new GalatAkses();
  if (!r.berkasSkLokasi) throw new GalatPengguna("SK belum diunggah.");
  return { nama: r.berkasSkNama ?? "sk-akreditasi.pdf", isi: await bacaBerkas(r.berkasSkLokasi) };
}

// ---------------------------------------------------------------- bantuan isi dari PDF SK

function pastikanBolehBacaSk(p: Pengguna) {
  if (p.peran !== "ADMIN" && p.peran !== "TIM_PRODI") throw new GalatAkses();
}

async function teksSk(isi: Buffer): Promise<string> {
  if (isi.subarray(0, 5).toString("latin1") !== "%PDF-") throw new GalatPengguna("SK harus berupa berkas PDF.");
  if (isi.length > UKURAN_SK) throw new GalatPengguna("PDF SK terlalu besar (maks. 20 MB).");
  const teks = (await teksPerHalaman(isi)).slice(0, 6).join("\n");
  if (teks.replace(/\s/g, "").length < 40) throw new GalatPengguna("Teks SK tidak terbaca (mungkin hasil pindai). Isi formulir secara manual.");
  return teks;
}

/** Tanpa AI: cari pola tanggal, nomor SK, dan peringkat di teks PDF SK. Hasilnya hanya usulan. */
export async function bacaSkPola(p: Pengguna, isi: Buffer): Promise<UsulanSk> {
  pastikanBolehBacaSk(p);
  return bacaSk(await teksSk(isi));
}

const SISTEM_SK = [
  "Anda membaca teks Surat Keputusan (SK) akreditasi program studi dari LAM Teknik atau BAN-PT.",
  "Ambil: peringkat/status akreditasi, nomor SK, tanggal SK ditetapkan, tanggal mulai berlaku, dan tanggal berlaku sampai.",
  "Tulis tanggal dalam format YYYY-MM-DD. Kosongkan (null) bila tidak tertulis di teks; jangan menebak.",
].join("\n");

const skemaSk = z.object({
  peringkat: z.string().nullable(),
  nomorSk: z.string().nullable(),
  tanggalSk: z.string().nullable(),
  berlakuMulai: z.string().nullable(),
  berlakuSampai: z.string().nullable(),
});

function promptSk(teks: string) {
  return `## TEKS SK (angka panjang seperti NIP disamarkan)\n${samarkanAngkaPanjang(teks).slice(0, 12000)}`;
}

/** Perkiraan sebelum "Baca dengan AI": token dan model dari Pengaturan LLM. */
export async function perkiraanBacaSkAi(p: Pengguna, isi: Buffer) {
  pastikanBolehBacaSk(p);
  const pengguna = promptSk(await teksSk(isi));
  return { perkiraanToken: perkiraanToken(SISTEM_SK, pengguna, 5), model: (await modelAiAktif()).labelNarasi };
}

/** "Baca dengan AI" (hanya atas klik dan konfirmasi): usulan isian dari SK yang polanya tidak dikenali. */
export async function bacaSkAi(p: Pengguna, isi: Buffer): Promise<UsulanSk> {
  pastikanBolehBacaSk(p);
  const teks = await teksSk(isi);
  const r = await panggilTerstruktur({
    prodiId: p.prodiId ?? null, proyekId: null, tugasId: null, subBagianKode: "baca-sk-akreditasi",
    sistem: SISTEM_SK, pengguna: promptSk(teks), skema: skemaSk, maksTokenKeluaran: 1024,
    keluaranUji: () => {
      const u = bacaSk(teks);
      return { peringkat: u.peringkat ?? null, nomorSk: u.nomorSk ?? null, tanggalSk: u.tanggalSk ?? null, berlakuMulai: u.berlakuMulai ?? null, berlakuSampai: u.berlakuSampai ?? null };
    },
  });
  const tanggal = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const k = r.keluaran;
  return Object.fromEntries(Object.entries({
    peringkat: k.peringkat ?? undefined, nomorSk: k.nomorSk ?? undefined, tanggalSk: tanggal(k.tanggalSk),
    berlakuMulai: tanggal(k.berlakuMulai), berlakuSampai: tanggal(k.berlakuSampai),
  }).filter(([, v]) => v)) as UsulanSk;
}
