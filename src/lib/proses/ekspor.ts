import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { patchDocument, Paragraph, TextRun, AlignmentType, LineRuleType, type IPatch } from "docx";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { bacaBerkas, namaAman, simpanBerkas } from "@/lib/penyimpanan";
import { bacaAnggaran } from "@/lib/domain/anggaran-proyek";
import { BATAS_HALAMAN, perkiraanHalaman } from "@/lib/domain/ekspor";
import { bacaVarian, berlakuUntukJenjang, namaJenjang } from "@/lib/domain/instrumen";
import { bacaDokumen, teksDokumen, type DokTiptap } from "@/lib/domain/narasi";
import { hitungKata } from "@/lib/domain/teks";
import { aktifkanPerbaruiField, siapkanDokumen, type LaporanTemplate, type SubTemplate } from "@/lib/ekspor/template";
import { isiDataProyek, type AnggotaTim, type DataEkspor } from "@/lib/ekspor/isi-data";
import { dokumenKeWord, konteksBaru, patchDaftar, patchIsi } from "@/lib/ekspor/word";
import { hitungHalamanDocx } from "@/lib/ekspor/halaman";
import { skemaTimPenyusun, type IdentitasProdi, type TimPenyusun } from "@/lib/validasi";

/**
 * F-22: ekspor .docx ke template LEDPS resmi (dikerjakan worker). Template disiapkan (placeholder per sub-bagian),
 * data proyek diisi (F-23), narasi Tiptap ditambal ke placeholder, Daftar Isi/Tabel/Gambar berupa field yang
 * diperbarui saat dibuka (F-24). Halaman dihitung lewat LibreOffice; ekspor > 150 halaman ditahan.
 */

/** Template LEDPS untuk versi instrumen: unggahan PJ di menu Instrumen, atau TEMPLATE_LEDPS_PATH (pengembangan). */
export async function bacaTemplateVersi(versi: { templateLedLokasi: string | null }): Promise<Buffer | null> {
  if (versi.templateLedLokasi) return bacaBerkas(versi.templateLedLokasi);
  const env = process.env.TEMPLATE_LEDPS_PATH;
  if (!env) return null;
  try {
    return await readFile(resolve(process.cwd(), env));
  } catch {
    return null;
  }
}

export function bacaTim(json: unknown): TimPenyusun {
  const r = skemaTimPenyusun.safeParse(json ?? { dosen: [], tendik: [] });
  return r.success ? r.data : { dosen: [], tendik: [] };
}

/** Semua sub-bagian versi (urut dokumen) beserta keberlakuan untuk jenjang dan semua varian instruksinya. */
export async function subBagianTemplate(versiId: string, jenjang: string) {
  const sub = await prisma.subBagian.findMany({
    where: { bagian: { versiId } },
    orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }],
    include: { bagian: { select: { kode: true, nama: true, jenis: true } } },
  });
  return sub.map((s) => ({
    id: s.id,
    kode: s.kode,
    label: `${s.bagian.kode} ${s.label ? `${s.label} ` : ""}${s.judul}`.trim(),
    judul: s.judul,
    tipe: s.tipe,
    bagianKode: s.bagian.kode,
    bagianNama: s.bagian.nama,
    instruksi: bacaVarian(s.varian).map((v) => v.instruksi).filter(Boolean),
    berlaku: berlakuUntukJenjang(s, jenjang),
  }));
}

/** Siapkan template untuk satu jenjang (dipakai juga untuk laporan di halaman Instrumen). */
export async function siapkanTemplate(asli: Buffer, sub: SubTemplate[]): Promise<{ zip: JSZip; indentasi: Record<string, number>; laporan: LaporanTemplate }> {
  const zip = await JSZip.loadAsync(asli);
  const doc = zip.file("word/document.xml");
  const set = zip.file("word/settings.xml");
  if (!doc) throw new Error("Berkas template bukan dokumen Word (.docx) yang sah.");
  const num = zip.file("word/numbering.xml");
  const h = siapkanDokumen(await doc.async("string"), sub, num ? await num.async("string") : "");
  zip.file("word/document.xml", h.xml);
  if (set) zip.file("word/settings.xml", aktifkanPerbaruiField(await set.async("string")));
  return { zip, indentasi: h.indentasi, laporan: h.laporan };
}

const anggota = (a: TimPenyusun["dosen"][number]): AnggotaTim => ({
  nama: a.nama, nomorInduk: a.nomorInduk ?? "", jabatan: a.jabatan ?? "", tugas: a.tugas ?? "",
});

function tanggalHariIni(): { tanggal: string; tahun: string } {
  const b = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const v = (t: string) => b.find((x) => x.type === t)?.value ?? "";
  return { tanggal: `${v("day")} – ${v("month")} – ${v("year")}`, tahun: v("year") };
}

export interface HasilBangun {
  isi: Buffer;
  peringatan: string[];
  masalah: string[];
  laporan: LaporanTemplate;
  perkiraanHalaman: number;
}

/** Bangun berkas .docx LED proyek. */
export async function bangunDocx(proyekId: string): Promise<HasilBangun> {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({
    where: { id: proyekId },
    include: { prodi: true, versi: true },
  });
  // revisi 19 Okt 2026: UPPS diganti identitas fakultas; daftar prodi di halaman identitas = semua prodi fakultas
  const fakultas = await prisma.fakultas.findUnique({ where: { id: "utama" } });
  const semuaProdi = await prisma.prodi.findMany({ orderBy: { nama: "asc" } });
  const asli = await bacaTemplateVersi(proyek.versi);
  if (!asli) throw new Error("Template LED belum diunggah untuk instrumen ini (menu Instrumen).");
  const sub = await subBagianTemplate(proyek.versiId, proyek.jenjang);
  const { zip, indentasi, laporan } = await siapkanTemplate(asli, sub);

  // data proyek (halaman muka, identitas, tim)
  const ident = (proyek.prodi.identitas ?? {}) as Partial<IdentitasProdi>;
  const tim = bacaTim(proyek.timPenyusun);
  const { tanggal, tahun } = tanggalHariIni();
  const data: DataEkspor = {
    perguruanTinggi: fakultas?.perguruanTinggi ?? "",
    upps: fakultas?.nama ?? "",
    jenisProgram: namaJenjang(proyek.jenjang),
    namaProdi: proyek.prodi.nama,
    kota: ident.kota ?? fakultas?.kota ?? "",
    tahun,
    tanggalPengisian: tanggal,
    identitas: {
      alamat: ident.alamat ?? fakultas?.alamat ?? "",
      telepon: ident.telepon ?? "",
      emailWebsite: [ident.email, ident.laman].filter(Boolean).join(" / "),
      skPendirian: ident.skPendirian ?? "",
      tanggalSkPendirian: ident.tanggalSkPendirian ?? "",
      pejabatSkPendirian: ident.pejabatSkPendirian ?? "",
      skPembukaan: ident.skPembukaan ?? "",
      tanggalSkPembukaan: ident.tanggalSkPembukaan ?? "",
      pejabatSkPembukaan: ident.pejabatSkPembukaan ?? "",
      tahunPertamaMenerima: ident.tahunPertamaMenerima ?? "",
      peringkatAkreditasi: ident.peringkatAkreditasi ?? "",
      nomorSkAkreditasi: ident.nomorSkAkreditasi ?? "",
    },
    prodiUpps: semuaProdi.map((x, i) => {
      const id = (x.identitas ?? {}) as Partial<IdentitasProdi>;
      const sampai = x.akreditasiBerlakuSampai
        ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(x.akreditasiBerlakuSampai)
        : "–";
      return [String(i + 1), namaJenjang(x.jenjang), x.nama, id.peringkatAkreditasi ?? "–", id.nomorSkAkreditasi ?? "–", sampai, "–"];
    }),
    timDosen: tim.dosen.map(anggota),
    timTendik: tim.tendik.map(anggota),
  };
  const docXml = await zip.file("word/document.xml")!.async("string");
  const terisi = isiDataProyek(docXml, data);
  zip.file("word/document.xml", terisi.xml);
  const disiapkan = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  // narasi aktif per sub-bagian
  const draf = await prisma.bagianDraf.findMany({ where: { proyekId, versiAktifId: { not: null } }, select: { subBagianId: true, versiAktifId: true } });
  const versi = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } }, select: { id: true, isi: true } });
  const isiSub = new Map<string, DokTiptap>();
  for (const d of draf) {
    const v = versi.find((x) => x.id === d.versiAktifId);
    if (v) isiSub.set(d.subBagianId, bacaDokumen(v.isi));
  }
  const dokumen = await prisma.dokumen.findMany({ where: { OR: [{ proyekId }, { proyekId: null }] }, select: { id: true, lokasi: true, jenis: true, judul: true, namaBerkas: true, tautanBukti: true } });
  const ctx = konteksBaru(async (id) => {
    const d = dokumen.find((x) => x.id === id && x.jenis === "gambar");
    return d ? { data: await bacaBerkas(d.lokasi) } : null;
  });

  const patches: Record<string, IPatch> = {};
  let kata = 0;
  for (const s of sub) {
    if (!laporan.placeholder.includes(s.kode)) continue;
    const indent = indentasi[s.kode] ?? 0;
    if (s.kode.startsWith("LAMPIRAN")) {
      patches[s.kode] = patchIsi(lampiranTautan(dokumen, indent));
      continue;
    }
    const doc = isiSub.get(s.id);
    if (!doc) {
      ctx.masalah.push(`${s.label} belum punya draf.`);
      patches[s.kode] = patchIsi([new Paragraph({ indent: { left: indent }, children: [new TextRun({ text: "–", font: "Arial", size: 22 })] })]);
      continue;
    }
    kata += hitungKata(teksDokumen(doc, { tanpaTabel: true }));
    patches[s.kode] = patchIsi(await dokumenKeWord(doc, { bagianKode: s.bagianKode, indent, label: s.label }, ctx));
  }
  patches["DAFTAR-TABEL"] = patchDaftar("t");
  patches["DAFTAR-GAMBAR"] = patchDaftar("g");

  const isi = await patchDocument({ outputType: "nodebuffer", data: disiapkan, keepOriginalStyles: true, patches });
  const { pengaturan } = bacaAnggaran(proyek.anggaran);
  return {
    isi: Buffer.from(isi),
    peringatan: terisi.peringatan,
    masalah: ctx.masalah,
    laporan,
    perkiraanHalaman: perkiraanHalaman({
      kata,
      barisTabel: ctx.jumlah.barisTabel,
      gambar: ctx.jumlah.gambar,
      kataPerHalaman: pengaturan.kataPerHalaman,
      halamanTetap: 10, // halaman muka, identitas, tim, kata pengantar, ringkasan, daftar isi/tabel/gambar
    }),
  };
}

function lampiranTautan(dokumen: { judul: string | null; namaBerkas: string; tautanBukti: string | null }[], indent: number): Paragraph[] {
  const ada = dokumen.filter((d) => d.tautanBukti);
  const par = (teks: string) => new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 80 },
    indent: { left: indent },
    children: [new TextRun({ text: teks, font: "Arial", size: 22 })],
  });
  if (ada.length === 0) return [par("Tautan bukti sahih belum dicantumkan.")];
  return ada.map((d, i) => par(`${i + 1}. ${d.judul ?? d.namaBerkas}: ${d.tautanBukti}`));
}

/** Kerjakan satu ekspor (worker). */
export async function prosesEkspor(eksporId: string): Promise<string> {
  const klaim = await prisma.ekspor.updateMany({ where: { id: eksporId, status: "antre" }, data: { status: "diproses", pesan: null } });
  if (klaim.count === 0) return "dilewati";
  const e = await prisma.ekspor.findUniqueOrThrow({ where: { id: eksporId }, include: { proyek: { include: { prodi: true } } } });
  try {
    const h = await bangunDocx(e.proyekId);
    const lama = (e.pemeriksaan ?? {}) as { galat?: string[]; peringatan?: string[] };
    if (h.masalah.length > 0) {
      await prisma.ekspor.update({
        where: { id: eksporId },
        data: { status: "gagal", pesan: "Pemeriksaan isi gagal.", pemeriksaan: { galat: h.masalah, peringatan: [...(lama.peringatan ?? []), ...h.peringatan] } },
      });
      return "gagal";
    }
    const halaman = await hitungHalamanDocx(h.isi).catch((err) => {
      console.error("[ekspor] hitung halaman gagal:", err instanceof Error ? err.message : err);
      return null;
    });
    const jumlah = halaman ?? h.perkiraanHalaman;
    const nama = namaAman(`LED ${e.proyek.prodi.nama} ${e.proyek.nama}.docx`);
    const simpan = await simpanBerkas(`ekspor/${e.proyekId}`, nama, h.isi);
    const ditahan = jumlah > BATAS_HALAMAN;
    const peringatan = [...(lama.peringatan ?? []), ...h.peringatan];
    if (halaman === null) peringatan.push("LibreOffice tidak tersedia: jumlah halaman diperkirakan dari jumlah kata, tabel, dan gambar.");
    await prisma.ekspor.update({
      where: { id: eksporId },
      data: {
        status: ditahan ? "ditahan" : "siap",
        lokasi: simpan.lokasi,
        namaBerkas: nama,
        ukuran: h.isi.length,
        jumlahHalaman: jumlah,
        halamanPerkiraan: halaman === null,
        pesan: ditahan ? `Dokumen ${jumlah} halaman, melebihi batas ${BATAS_HALAMAN} halaman. Ringkas narasi lalu ekspor ulang.` : null,
        pemeriksaan: { galat: [], peringatan, template: h.laporan } as unknown as Prisma.InputJsonValue,
      },
    });
    return ditahan ? "ditahan" : "siap";
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`[ekspor] ${eksporId}:`, pesan);
    await prisma.ekspor.update({ where: { id: eksporId }, data: { status: "gagal", pesan: pesan.slice(0, 500) } });
    return "gagal";
  }
}
