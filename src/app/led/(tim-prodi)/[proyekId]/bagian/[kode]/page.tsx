import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { modelAiAktif } from "@/modules/bersama/data/pengaturan";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { subLanjutkan } from "@/modules/led/domain/navigasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { LencanaStatus } from "@/components/lencana-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Petunjuk } from "@/components/petunjuk";
import { TombolGenerate, TombolTandaiSelesai } from "@/modules/led/komponen/narasi/tombol-generate";
import { hrefSub, muatKriteria } from "./muat";
import { LABEL_TIPE, LencanaStatusSub } from "./lencana-sub";
import { jumlahCatatanPerSub } from "@/modules/led/data/review";

export async function generateMetadata({ params }: PageProps<"/led/[proyekId]/bagian/[kode]">): Promise<Metadata> {
  const { kode } = await params;
  return { title: decodeURIComponent(kode) };
}

/** Ringkasan kriteria/bagian: judul, bobot, target, daftar sub-bagian dengan status, Lanjutkan, Generate semua. */
export default async function HalamanRingkasanKriteria({ params }: PageProps<"/led/[proyekId]/bagian/[kode]">) {
  const p = await wajibTimProdi();
  const model = await modelAiAktif();
  const { proyekId, kode: kodeMentah } = await params;
  const [d, catatan] = await Promise.all([muatKriteria(p, proyekId, decodeURIComponent(kodeMentah)), jumlahCatatanPerSub(p, proyekId)]);
  if (!d) notFound();
  const { proyek, bagian, target, statusSub, subGenerate, jumlahDraf, anggaranBagian, status } = d;
  const ts = proyek.tsTahunMulai;
  const istilah = bagian.jenis === "kriteria" ? "kriteria" : "bagian";
  const lanjut = subLanjutkan(bagian.subBagian.map((s) => ({ kode: s.kode, status: statusSub[s.kode] })));
  const jumlahSelesai = subGenerate.filter((s) => statusSub[s.kode] === "selesai").length;
  const mulaiBaru = bagian.subBagian.every((s) => statusSub[s.kode] === "belum" || statusSub[s.kode] === "data");

  // kelompokkan sub-bagian berurutan menurut grup
  const kelompok: { grup: string | null; sub: typeof bagian.subBagian }[] = [];
  for (const s of bagian.subBagian) {
    const akhir = kelompok[kelompok.length - 1];
    if (akhir && akhir.grup === s.grup) akhir.sub.push(s);
    else kelompok.push({ grup: s.grup, sub: [s] });
  }

  return (
    <>
      <JudulHalaman
        judul={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-muted-foreground">{bagian.kode}</span>
            {bagian.nama}
          </span>
        }
        deskripsi={`${bagian.subBagian.length} sub-bagian untuk jenjang ${namaJenjang(proyek.jenjang)}${d.jumlahButir ? ` · ${d.jumlahButir} butir penilaian, bobot ${formatAngka(d.bobot)}` : ""}${anggaranBagian ? ` · target ${anggaranBagian.halaman} halaman (± ${formatAngka(anggaranBagian.kataTotal, 0)} kata)` : ""}`}
        remah={[{ label: "Beranda LED", href: `/led/${proyek.id}` }, { label: bagian.kode }]}
        aksi={
          <>
            <LencanaStatus status={status} />
            {subGenerate.length > 0 && jumlahDraf === subGenerate.length && (
              <TombolTandaiSelesai proyekId={proyek.id} bagianKode={bagian.kode} selesai={status === "selesai"} />
            )}
            {subGenerate.length > 0 && (
              <TombolGenerate
                proyekId={proyek.id}
                bagianKode={bagian.kode}
                label={jumlahDraf > 0 ? "Generate ulang semua" : "Generate semua"}
                sudahAda={jumlahDraf > 0}
                nonaktif={d.tugasAktif.length > 0}
                model={model.labelNarasi}
              />
            )}
          </>
        }
      />
      <Petunjuk
        kunci="ringkasan-kriteria"
        fungsi={`Ringkasan ${istilah}: setiap sub-bagian dikerjakan di halamannya sendiri, satu pertanyaan satu halaman.`}
        langkah={[
          "Klik Lanjutkan untuk membuka sub-bagian pertama yang belum selesai.",
          "Di setiap halaman: baca instruksi template dan butir penilaian, periksa data LKPS, isi Bahan dari prodi (fakta untuk AI, tidak ikut diekspor), unggah dokumen pendukung, lalu Generate.",
          "Pindah dengan tombol Sebelumnya dan Berikutnya; bahan disimpan otomatis sebelum pindah.",
          `Atau klik Generate semua di halaman ini: urutannya indikator kinerja, latar belakang dan kebijakan, analisis faktor, lalu SWOT.`,
          `Setelah semua sub-bagian punya draf dan sudah diperiksa, klik Tandai selesai.`,
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Kemajuan</CardTitle>
          <CardDescription>
            {subGenerate.length > 0
              ? `${jumlahDraf} dari ${subGenerate.length} sub-bagian punya draf · ${jumlahSelesai} selesai${d.sedangDisusun ? " · penyusunan sedang berjalan" : ""}`
              : "Semua sub-bagian di bagian ini diisi dari data proyek."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Progress
            value={subGenerate.length ? Math.round((jumlahDraf / subGenerate.length) * 100) : 100}
            aria-label="Sub-bagian yang punya draf"
            className="h-2 sm:flex-1"
          />
          {lanjut && (
            <Button asChild>
              <Link href={hrefSub(proyek.id, bagian.kode, lanjut)}>
                {mulaiBaru ? "Mulai mengisi" : "Lanjutkan"}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {bagian.pengantar && <p className="max-w-4xl text-sm text-muted-foreground">{gantiLabelTS(bagian.pengantar, ts)}</p>}

      <div className="flex flex-col gap-6">
        {kelompok.map((k, i) => (
          <section key={`${k.grup}-${i}`} className="flex flex-col gap-2" aria-label={k.grup ?? "Sub-bagian"}>
            {k.grup && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{k.grup}</h2>}
            <ol className="divide-y overflow-hidden rounded-lg border">
              {k.sub.map((s) => {
                const nomor = bagian.subBagian.indexOf(s) + 1;
                const t = target[s.kode];
                return (
                  <li key={s.id}>
                    <Link
                      href={hrefSub(proyek.id, bagian.kode, s.kode)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{nomor}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">
                          {s.label && <span className="mr-1.5 font-mono text-xs text-muted-foreground">{s.label}</span>}
                          {s.judul}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>{LABEL_TIPE[s.tipe] ?? s.tipe}</span>
                          {s.butir.length > 0 && <span>butir {s.butir.map((b) => b.kode).join(", ")}</span>}
                          {t != null && <span>target ± {formatAngka(t, 0)} kata</span>}
                        </span>
                      </span>
                      {catatan[s.kode] && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary" title="Catatan asesor belum selesai">
                          {catatan[s.kode].terbuka + catatan[s.kode].diperbaiki} catatan
                        </span>
                      )}
                      <LencanaStatusSub status={statusSub[s.kode]} />
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
