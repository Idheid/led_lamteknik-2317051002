import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { patchDocument, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, LineRuleType, WidthType, type IPatch } from "docx";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { bacaBerkas, namaAman, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { bacaAnggaran } from "@/modules/led/domain/anggaran-proyek";
import { BATAS_HALAMAN, perkiraanHalaman } from "@/modules/led/domain/ekspor";
import { bacaVarian, berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { bacaDokumen, teksDokumen, type DokTiptap } from "@/modules/led/domain/narasi";
import { hitungKata } from "@/modules/bersama/domain/teks";
import { aktifkanPerbaruiField, siapkanDokumen, type LaporanTemplate, type SubTemplate } from "@/modules/led/ekspor/template";
import { isiDataProyek, PERINGATAN_LOGO, type AnggotaTim, type DataEkspor } from "@/modules/led/ekspor/isi-data";
import { sisipkanLogo } from "@/modules/led/ekspor/logo";
import { nilaiIdentitas } from "@/modules/led/domain/halaman-muka";
import { berkasLogo } from "@/modules/led/data/logo";
import { dokumenKeWord, konteksBaru, patchDaftar, patchIsi } from "@/modules/led/ekspor/word";
import { hitungHalamanDocx } from "@/modules/led/ekspor/halaman";
import { tandaiDraf } from "@/modules/led/ekspor/xml";
import { dokumenDirujuk, namaDokumen, rujukanSingkat, type DokumenRujukan } from "@/modules/led/domain/rujukan";
import { nilaiButirUntukProyek } from "@/modules/led/data/nilai-butir";
import { type IdentitasProdi } from "@/modules/bersama/validasi";
import { skemaTimPenyusun, type TimPenyusun } from "@/modules/led/validasi";

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

export type JenisEkspor = "draf" | "final";

/**
 * Bangun berkas .docx LED proyek. Revisi 22 Okt 2026: rujukan singkat di akhir paragraf, Daftar Rujukan di Lampiran,
 * dan ekspor DRAF (setiap halaman bertanda DRAF, kaki halaman memuat tanggal ekspor).
 */
export async function bangunDocx(proyekId: string, opsi: { jenis?: JenisEkspor } = {}): Promise<HasilBangun> {
  const jenis = opsi.jenis ?? "final";
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
  // D9: nilai identitas pengusul dihitung sama dengan pratinjau Halaman muka & identitas
  const n = nilaiIdentitas({ fakultas, identitas: ident as Record<string, string | undefined>, prodi: { nama: proyek.prodi.nama, namaJenjang: namaJenjang(proyek.jenjang) } });
  const data: DataEkspor = {
    perguruanTinggi: n.perguruanTinggi,
    upps: n.upps,
    jenisProgram: n.jenisProgram,
    namaProdi: n.namaProdi,
    kota: fakultas?.kota || ident.kota || "",
    tahun,
    tanggalPengisian: tanggal,
    identitas: {
      alamat: n.alamat,
      telepon: n.telepon,
      emailWebsite: n.emailWebsite,
      skPendirian: n.skPendirian,
      tanggalSkPendirian: n.tanggalSkPendirian,
      pejabatSkPendirian: n.pejabatSkPendirian,
      skPembukaan: n.skPembukaan,
      tanggalSkPembukaan: n.tanggalSkPembukaan,
      pejabatSkPembukaan: n.pejabatSkPembukaan,
      tahunPertamaMenerima: n.tahunPertamaMenerima,
      peringkatAkreditasi: n.peringkatAkreditasi,
      nomorSkAkreditasi: n.nomorSkAkreditasi,
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
  // D8: logo perguruan tinggi (menu LED, Logo sampul LED) menggantikan kotak "Logo Perguruan Tinggi"
  const logo = await berkasLogo();
  const relsLama = await zip.file("word/_rels/document.xml.rels")?.async("string");
  const ctLama = await zip.file("[Content_Types].xml")?.async("string");
  const dgnLogo = logo && relsLama && ctLama ? sisipkanLogo(terisi.xml, relsLama, ctLama, logo.info) : null;
  if (dgnLogo && logo) {
    terisi.xml = dgnLogo.document;
    terisi.peringatan = terisi.peringatan.filter((x) => x !== PERINGATAN_LOGO);
    zip.file("word/_rels/document.xml.rels", dgnLogo.rels);
    zip.file("[Content_Types].xml", dgnLogo.contentTypes);
    zip.file(dgnLogo.media, logo.isi);
  }
  zip.file("word/document.xml", terisi.xml);
  const disiapkan = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  // narasi aktif per sub-bagian
  const draf = await prisma.bagianDraf.findMany({ where: { proyekId, versiAktifId: { not: null } }, select: { subBagianId: true, versiAktifId: true } });
  const versi = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } }, select: { id: true, isi: true, sumber: true } });
  const isiSub = new Map<string, { isi: DokTiptap; legenda: Record<string, string> }>();
  for (const d of draf) {
    const v = versi.find((x) => x.id === d.versiAktifId);
    if (v) isiSub.set(d.subBagianId, { isi: bacaDokumen(v.isi), legenda: (v.sumber ?? {}) as Record<string, string> });
  }
  const dokumen = await prisma.dokumen.findMany({
    where: { OR: [{ proyekId }, { proyekId: null }] },
    select: { id: true, lokasi: true, jenis: true, judul: true, namaBerkas: true, tautanBukti: true, tahunTerbit: true, proyekId: true },
  });
  const dokumenRujukan: DokumenRujukan[] = dokumen.map((d) => ({
    id: d.id, judul: d.judul, namaBerkas: d.namaBerkas, tahunTerbit: d.tahunTerbit, tautanBukti: d.tautanBukti, bersama: d.proyekId === null,
  }));
  // kode metrik → tabel LKPS sumbernya, untuk rujukan "(LKPS Tabel …, diolah)"
  const tabelMetrik = new Map<string, string[]>();
  for (const n of (await nilaiButirUntukProyek(proyek)).daftar) {
    for (const m of n.hasil?.metrik ?? []) tabelMetrik.set(m.kode, [...new Set([...(tabelMetrik.get(m.kode) ?? []), ...n.hasil!.tabel])]);
  }
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
      patches[s.kode] = patchIsi(daftarRujukanWord(dokumenDirujuk([...isiSub.values()], dokumenRujukan), indent));
      continue;
    }
    const d = isiSub.get(s.id);
    if (!d) {
      ctx.masalah.push(`${s.label} belum punya draf.`);
      patches[s.kode] = patchIsi([new Paragraph({ indent: { left: indent }, children: [new TextRun({ text: "–", font: "Arial", size: 22 })] })]);
      continue;
    }
    kata += hitungKata(teksDokumen(d.isi, { tanpaTabel: true }));
    const rujukan = (kode: string[]) => rujukanSingkat(kode, { legenda: d.legenda, dokumen: dokumenRujukan, tabelMetrik });
    patches[s.kode] = patchIsi(await dokumenKeWord(d.isi, { bagianKode: s.bagianKode, indent, label: s.label, rujukan }, ctx));
  }
  patches["DAFTAR-TABEL"] = patchDaftar("t");
  patches["DAFTAR-GAMBAR"] = patchDaftar("g");

  let isi: Buffer = Buffer.from(await patchDocument({ outputType: "nodebuffer", data: disiapkan, keepOriginalStyles: true, patches }));
  if (jenis === "draf") isi = await tandaiBerkasDraf(isi);
  const { pengaturan } = bacaAnggaran(proyek.anggaran);
  return {
    isi,
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

/**
 * Daftar Rujukan di Lampiran (revisi 22 Okt 2026, menggantikan daftar tautan bukti): semua dokumen yang dirujuk
 * narasi, dengan nomor, judul, tahun, asal, dan tautan bukti sahih.
 */
function daftarRujukanWord(dokumen: DokumenRujukan[], indent: number): (Paragraph | Table)[] {
  const par = (teks: string, o: { bold?: boolean; size?: number } = {}) => new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 240, lineRule: LineRuleType.AUTO, after: 60 },
    children: [new TextRun({ text: teks, font: "Arial", size: o.size ?? 20, bold: o.bold })],
  });
  const judul = new Paragraph({
    indent: { left: indent },
    spacing: { after: 120 },
    children: [new TextRun({ text: "Daftar Rujukan", font: "Arial", size: 22, bold: true })],
  });
  if (dokumen.length === 0) {
    return [judul, new Paragraph({ indent: { left: indent }, children: [new TextRun({ text: "Narasi tidak merujuk dokumen unggahan.", font: "Arial", size: 22 })] })];
  }
  const kepala = ["No.", "Judul dokumen", "Tahun", "Asal", "Tautan bukti sahih"];
  const baris = dokumen.map((d, i) => [
    String(i + 1), namaDokumen(d), d.tahunTerbit ? String(d.tahunTerbit) : "t.t.",
    d.bersama ? "Dokumen bersama fakultas" : "Dokumen LED", d.tautanBukti ?? "belum ada tautan",
  ]);
  return [judul, new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    indent: { size: indent, type: WidthType.DXA },
    rows: [kepala, ...baris].map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: r.map((c) => new TableCell({ children: [par(c, { bold: i === 0 })] })),
    })),
  })];
}

/** Tanggal ekspor untuk kaki halaman draf. */
function tanggalPanjang(): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

/** Setiap halaman draf bertanda DRAF (header) dan kaki halaman memuat tanggal ekspor (footer). */
async function tandaiBerkasDraf(isi: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(isi);
  const tanggal = tanggalPanjang();
  for (const nama of Object.keys(zip.files)) {
    const m = /^word\/(header|footer)\d*\.xml$/.exec(nama);
    if (!m) continue;
    const xml = await zip.file(nama)!.async("string");
    zip.file(nama, tandaiDraf(xml, m[1] as "header" | "footer", m[1] === "header" ? "DRAF" : `DRAF · diekspor ${tanggal} · belum final`));
  }
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

/** Kerjakan satu ekspor (worker). */
export async function prosesEkspor(eksporId: string): Promise<string> {
  const klaim = await prisma.ekspor.updateMany({ where: { id: eksporId, status: "antre" }, data: { status: "diproses", pesan: null } });
  if (klaim.count === 0) return "dilewati";
  const e = await prisma.ekspor.findUniqueOrThrow({ where: { id: eksporId }, include: { proyek: { include: { prodi: true } } } });
  const draf = e.jenis === "draf";
  try {
    const h = await bangunDocx(e.proyekId, { jenis: draf ? "draf" : "final" });
    const lama = (e.pemeriksaan ?? {}) as { galat?: string[]; peringatan?: string[] };
    // ekspor DRAF bisa kapan saja: isi yang belum lengkap hanya menjadi peringatan
    if (draf) h.peringatan.push(...h.masalah.map((m) => `Belum lengkap: ${m}`));
    if (!draf && h.masalah.length > 0) {
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
    // revisi 22 Okt 2026: yang dibatasi 150 halaman hanya halaman sebelum judul LAMPIRAN
    const jumlah = halaman?.sebelumLampiran ?? h.perkiraanHalaman;
    const nama = namaAman(`${draf ? "DRAF " : ""}LED ${e.proyek.prodi.nama} ${e.proyek.nama}.docx`);
    const simpan = await simpanBerkas(`ekspor/${e.proyekId}`, nama, h.isi);
    const ditahan = !draf && jumlah > BATAS_HALAMAN;
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
        jumlahHalamanTotal: halaman?.total ?? null,
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
