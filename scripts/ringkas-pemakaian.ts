/**
 * Rencana 10 Nov T11: ringkasan pemakaian per "Susun seluruh LED" dari LogPemakaian, TugasGenerate, dan VersiDraf.
 * Untuk setiap rangkaian (tugas rangkaianKe = 1 sampai bagian terakhir): panggilan AI per jenis (narasi, periksa,
 * perbaikan, periksa ulang, gabung), token, durasi rata-rata per sub-bagian, sub-bagian dilewati (sidik jari sama) dan
 * tanpa AI, vektor kueri baru, dokumen yang memakai ulang hasil pemrosesan, dan perbandingan mode tunggal vs gabung.
 *
 * Pakai: npx tsx scripts/ringkas-pemakaian.ts [--proyek <id>] [--keluaran docs/uji/hasil-pemakaian.md]
 * Membaca DATABASE_URL dari .env (basis data yang dipakai aplikasi).
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "@/modules/bersama/db";

function arg(nama: string): string | undefined {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function jenisLog(kode: string | null): string {
  const m = /^(periksa-ulang|periksa|perbaikan|gabung|verifikasi):/.exec(kode ?? "");
  return m ? m[1] : "narasi";
}

const angka = (n: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

interface LabelKalimat { label: string }

async function main() {
  const proyekId = arg("proyek");
  const tugas = await prisma.tugasGenerate.findMany({
    where: { rangkaianTotal: { not: null }, ...(proyekId ? { proyekId } : {}) },
    orderBy: { createdAt: "asc" },
    include: { proyek: { select: { nama: true } } },
  });
  // kelompokkan tugas menjadi rangkaian: mulai dari rangkaianKe = 1
  const rangkaian: (typeof tugas)[] = [];
  for (const t of tugas) {
    if (t.rangkaianKe === 1 || rangkaian.length === 0) rangkaian.push([t]);
    else rangkaian[rangkaian.length - 1].push(t);
  }
  const baris: string[] = [
    "# Ringkasan pemakaian per Susun seluruh LED",
    "",
    `Dibuat ${new Date().toISOString()} dengan \`scripts/ringkas-pemakaian.ts\` (Rencana 10 Nov T11).`,
    "",
  ];
  if (rangkaian.length === 0) baris.push("Belum ada Susun seluruh LED di basis data ini.");
  for (const r of rangkaian) {
    const awal = r[0].createdAt;
    const akhir = r.reduce((x, t) => (t.updatedAt > x ? t.updatedAt : x), r[0].updatedAt);
    const id = r.map((t) => t.id);
    const rencana = r.reduce((s, t) => s + t.subBagianKode.length, 0);
    const log = await prisma.logPemakaian.findMany({
      where: { proyekId: r[0].proyekId, createdAt: { gte: awal, lte: new Date(akhir.getTime() + 15 * 60_000) } },
    });
    const versi = await prisma.versiDraf.findMany({ where: { tugasId: { in: id } }, select: { model: true, modeGenerate: true, pemeriksaan: true } });
    const tanpaAi = versi.filter((v) => v.model === "tanpa AI").length;
    const dilewati = Math.max(0, rencana - versi.length);
    const per = new Map<string, { n: number; masuk: number; keluar: number; cache: number; durasi: number; gagal: number }>();
    for (const l of log) {
      const j = jenisLog(l.subBagianKode);
      const x = per.get(j) ?? { n: 0, masuk: 0, keluar: 0, cache: 0, durasi: 0, gagal: 0 };
      if (l.berhasil) {
        x.n += 1;
        x.masuk += l.tokenMasuk;
        x.keluar += l.tokenKeluar;
        x.cache += l.tokenCache;
        x.durasi += l.durasiMs ?? 0;
      } else x.gagal += 1;
      per.set(j, x);
    }
    const kueriBaru = await prisma.embeddingKueri.count({ where: { dibuatPada: { gte: awal, lte: akhir } } }).catch(() => 0);
    const dokumenUlang = await prisma.dokumen.count({ where: { proyekId: r[0].proyekId, dokumenSumberPakaiUlangId: { not: null } } });
    const narasi = per.get("narasi");
    baris.push(
      `## ${r[0].proyek.nama} — ${awal.toISOString().slice(0, 16).replace("T", " ")} UTC`,
      "",
      `- Bagian: ${r.length} dari ${r[0].rangkaianTotal}; sub-bagian direncanakan ${rencana}; versi baru ${versi.length}; dilewati (sidik jari sama) ${dilewati} (${angka(rencana ? (100 * dilewati) / rencana : 0, 1)}%); tanpa AI ${tanpaAi} (${angka(rencana ? (100 * tanpaAi) / rencana : 0, 1)}%).`,
      `- Durasi rata-rata panggilan narasi: ${narasi?.n ? angka(narasi.durasi / narasi.n / 1000, 1) : "—"} detik; waktu total rangkaian ${angka((akhir.getTime() - awal.getTime()) / 60000, 1)} menit.`,
      `- Vektor kueri baru selama rangkaian: ${kueriBaru}; dokumen LED yang memakai ulang hasil pemrosesan: ${dokumenUlang}.`,
      "",
      "| Jenis panggilan | Berhasil | Gagal | Token masuk | Token keluar | Token cache |",
      "| --- | --- | --- | --- | --- | --- |",
      ...[...per].map(([j, x]) => `| ${j} | ${x.n} | ${x.gagal} | ${angka(x.masuk)} | ${angka(x.keluar)} | ${angka(x.cache)} |`),
      "",
    );
    const mode = new Map<string, { versi: number; kalimat: number; tidak: number }>();
    for (const v of versi) {
      const kal = ((v.pemeriksaan as { kalimatAi?: { hasil: LabelKalimat[] } } | null)?.kalimatAi?.hasil ?? []);
      const x = mode.get(v.modeGenerate ?? "tunggal") ?? { versi: 0, kalimat: 0, tidak: 0 };
      x.versi += 1;
      x.kalimat += kal.length;
      x.tidak += kal.filter((k) => k.label === "tidak_didukung").length;
      mode.set(v.modeGenerate ?? "tunggal", x);
    }
    if (mode.size > 1) {
      baris.push(
        "| Mode generate | Versi | Panggilan narasi/gabung | Kalimat diperiksa AI | Tidak didukung |",
        "| --- | --- | --- | --- | --- |",
        ...[...mode].map(([mo, x]) => `| ${mo} | ${x.versi} | ${mo === "gabung" ? per.get("gabung")?.n ?? 0 : narasi?.n ?? 0} | ${x.kalimat} | ${angka(x.kalimat ? (100 * x.tidak) / x.kalimat : 0, 1)}% |`),
        "",
      );
    }
  }
  const md = baris.join("\n");
  const keluar = arg("keluaran");
  if (keluar) writeFileSync(keluar, md, "utf8");
  console.log(md);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
