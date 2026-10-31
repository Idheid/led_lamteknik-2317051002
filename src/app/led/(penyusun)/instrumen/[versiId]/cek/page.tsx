import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { GalatPengguna } from "@/modules/bersama/akses";
import { dataCekInstrumen } from "@/modules/led/data/unggah-instrumen";
import { katalogRumus } from "@/modules/led/domain/metrik-lkps";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PanelCek, TombolAktifkan, type ButirTampil } from "./panel-cek";

export const metadata: Metadata = { title: "Periksa hasil ekstraksi" };

/**
 * Halaman cek (revisi 19 Okt 2026): PDF asli di kiri, tabel butir di kanan. Usulan AI ditandai sampai PJ
 * mengonfirmasi; pemeriksaan otomatis harus lolos sebelum "Sudah dicek, aktifkan".
 */
export default async function HalamanCekInstrumen({ params }: PageProps<"/led/instrumen/[versiId]/cek">) {
  const p = await wajibPenanggungJawab();
  const { versiId } = await params;
  const data = await dataCekInstrumen(p, versiId).catch((e) => {
    if (e instanceof GalatPengguna) return null;
    throw e;
  });
  if (!data) notFound();
  const { versi, butir, bagian, sub, cek, info } = data;
  const jenjang = versi.jenjangUtama ?? "S1";
  const terkunci = versi.status === "aktif" || versi._count.proyek > 0;
  const dicek = butir.length - cek.belumDikonfirmasi;
  const tampil: ButirTampil[] = butir.map((b) => ({
    id: b.id, kode: b.kode, no: b.no, sub: b.sub, urutan: b.urutan, bagianKode: b.bagianKode, elemen: b.elemen, indikator: b.indikator,
    bobot: Number(b.bobot), jenis: b.jenis, tabelLkps: b.tabelLkps, deskriptorSkor4: b.deskriptorSkor4, deskriptorSkor3: b.deskriptorSkor3,
    deskriptorSkor2: b.deskriptorSkor2, deskriptorSkor1: b.deskriptorSkor1, deskriptorSkor0: b.deskriptorSkor0, unsurSkor4: b.unsurSkor4,
    kodeRumus: b.kodeRumus, subBagianIds: b.subBagian.map((x) => x.subBagian.id), dikonfirmasi: b.dikonfirmasi, usulanAi: b.usulanAi, catatan: b.catatan,
  }));
  const ekstraksiSelesai = !info || info.status === "selesai";
  const bisa = !terkunci && ekstraksiSelesai && cek.galat.length === 0;
  return (
    <>
      <JudulHalaman
        judul="Periksa hasil ekstraksi"
        deskripsi={`${versi.nama} · ${namaJenjang(jenjang)} · ${butir.length} butir`}
        remah={[{ label: "Instrumen", href: "/led/instrumen" }, { label: versi.kode, href: `/led/instrumen/${versi.id}` }, { label: "Periksa" }]}
        aksi={!terkunci && (
          <TombolAktifkan versiId={versi.id} bisa={bisa} alasan={!ekstraksiSelesai ? "Ekstraksi belum selesai." : cek.galat[0] ?? null} />
        )}
      />
      <Petunjuk
        kunci="cek-instrumen"
        fungsi="Bandingkan setiap butir hasil ekstraksi dengan PDF asli. Kolom bertanda usulan AI (sub-bagian, jenis, rumus, dan kolom lain yang diragukan) wajib dicek."
        langkah={[
          "Klik satu butir: PDF di kiri melompat ke halamannya.",
          "Cocokkan elemen, indikator, bobot, dan deskriptor skor dengan PDF. Perbaiki bila perlu.",
          "Periksa sub-bagian template, jenis (angka/narasi), dan rumus lama yang diusulkan AI.",
          "Klik Simpan dan tandai dicek (atau Sudah benar, tandai dicek). Butir berikutnya yang belum dicek terbuka otomatis.",
          "Setelah pemeriksaan otomatis lolos, klik Sudah dicek, aktifkan.",
        ]}
      />
      <Card>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span><span className="text-muted-foreground">Sudah dicek:</span> <span className="tabular-nums">{dicek} / {butir.length}</span></span>
            <span><span className="text-muted-foreground">Total bobot:</span> <span className="tabular-nums">{formatAngka(cek.totalBobot)}</span></span>
            <span><span className="text-muted-foreground">Sub-bagian:</span> <span className="tabular-nums">{sub.length}</span></span>
            {terkunci && <span className="text-muted-foreground">Instrumen ini sudah aktif atau dipakai LED; hanya bisa dilihat.</span>}
          </div>
          <Progress value={butir.length ? Math.round((dicek / butir.length) * 100) : 0} className="h-2" aria-label="Butir yang sudah dicek" />
          <ul className="space-y-1">
            {cek.galat.length === 0 && (
              <li className="flex gap-2"><CircleCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />Pemeriksaan otomatis lolos: total bobot 100, nomor berurutan, setiap butir punya deskriptor skor 4 dan sub-bagian, setiap sub-bagian punya instruksi.</li>
            )}
            {cek.galat.map((g) => (
              <li key={g} className="flex gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />{g}</li>
            ))}
            {cek.peringatan.map((g) => (
              <li key={g} className="flex gap-2 text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{g}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <PanelCek
        versiId={versi.id}
        jenjang={jenjang}
        butir={tampil}
        sub={sub.filter((s) => s.tipe !== "data" && s.tipe !== "otomatis").map((s) => ({ id: s.id, kode: s.kode, judul: s.judul, bagianKode: s.bagianKode }))}
        rumus={katalogRumus().map((r) => ({ kode: r.kode, judul: r.judul, rumus: r.rumus }))}
        bagian={bagian.map((b) => b.kode).filter((k) => k !== "AWAL")}
        halamanButir={info?.halamanButir ?? {}}
        adaMatriks={Boolean(versi.matriksLokasi)}
        terkunci={terkunci}
      />
    </>
  );
}
