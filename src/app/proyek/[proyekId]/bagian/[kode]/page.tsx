import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileUp, Sparkles } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { butirAnggaranProyek, halamanBagian } from "@/lib/data/proyek";
import { bacaAnggaran, targetKataSubBagian } from "@/lib/domain/anggaran-proyek";
import { hitungAnggaran } from "@/lib/domain/anggaran";
import { bacaVarian, namaJenjang, varianUntukJenjang } from "@/lib/domain/instrumen";
import { formatAngka } from "@/lib/domain/teks";
import { gantiLabelTS } from "@/lib/domain/tahun-akademik";
import { JudulHalaman } from "@/components/judul-halaman";
import { LencanaStatus } from "@/components/lencana-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IsianJawaban } from "./isian-jawaban";

export async function generateMetadata({ params }: PageProps<"/proyek/[proyekId]/bagian/[kode]">): Promise<Metadata> {
  const { kode } = await params;
  return { title: decodeURIComponent(kode) };
}

const LABEL_TIPE: Record<string, string> = {
  data: "Diisi dari data", narasi: "Narasi", bersama: "Bagian bersama", iku: "Indikator kinerja", otomatis: "Otomatis",
};

function TombolSegera({ label, ikon }: { label: string; ikon: "generate" | "unggah" }) {
  const Ikon = ikon === "generate" ? Sparkles : FileUp;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button variant={ikon === "generate" ? "default" : "outline"} size="sm" disabled>
            <Ikon aria-hidden />
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{ikon === "generate" ? "Tersedia di iterasi 3 (mesin penyusun)" : "Tersedia di iterasi 2 (unggah dokumen)"}</TooltipContent>
    </Tooltip>
  );
}

export default async function HalamanBagianProyek({ params }: PageProps<"/proyek/[proyekId]/bagian/[kode]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId, kode: kodeMentah } = await params;
  const kode = decodeURIComponent(kodeMentah);
  const data = await halamanBagian(p, proyekId, kode);
  if (!data) notFound();
  const { proyek, bagian, jawaban } = data;
  const { butir: butirAnggaran } = await butirAnggaranProyek(p, proyekId);
  const { pengaturan, bagian: bagianAnggaran } = bacaAnggaran(proyek.anggaran);
  const anggaran = hitungAnggaran(bagianAnggaran, butirAnggaran, pengaturan);
  const target = targetKataSubBagian(
    anggaran,
    bagian.kode,
    bagian.subBagian.map((s) => ({ kode: s.kode, tipe: s.tipe, butir: s.butir.map((b) => b.kode) })),
  );
  const anggaranBagian = anggaran.bagian.find((b) => b.kode === bagian.kode);
  const status = proyek.status.find((s) => s.bagianKode === bagian.kode)?.status ?? "belum";
  const semuaButir = bagian.subBagian.flatMap((s) => s.butir);
  const bobot = semuaButir.reduce((n, b) => n + Number(b.bobot), 0);
  const ts = proyek.tsTahunMulai;

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
        deskripsi={`${bagian.subBagian.length} sub-bagian untuk jenjang ${namaJenjang(proyek.jenjang)}${semuaButir.length ? ` · ${semuaButir.length} butir penilaian, bobot ${formatAngka(bobot)}` : ""}${anggaranBagian ? ` · anggaran ${anggaranBagian.halaman} halaman (± ${formatAngka(anggaranBagian.kataTotal, 0)} kata)` : ""}`}
        remah={[{ label: "Beranda", href: `/proyek/${proyek.id}` }, { label: bagian.kode }]}
        aksi={
          <>
            <LencanaStatus status={status} />
            <TombolSegera label={bagian.jenis === "kriteria" ? "Generate kriteria" : "Generate bagian"} ikon="generate" />
          </>
        }
      />
      {bagian.pengantar && <p className="max-w-4xl text-sm text-muted-foreground">{gantiLabelTS(bagian.pengantar, ts)}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_15rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {kelompok.map((k, i) => (
            <section key={`${k.grup}-${i}`} className="flex flex-col gap-4">
              {k.grup && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{k.grup}</h2>}
              {k.sub.map((s) => {
                const v = varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang);
                const t = target[s.kode];
                const pemandu = s.butir.map((b) => b.pertanyaanPemandu).filter((x): x is string => Boolean(x));
                const dokumen = [...s.dokumenDiharapkan, ...s.butir.flatMap((b) => b.dokumenDiharapkan)];
                return (
                  <Card key={s.id} id={s.kode} className="scroll-mt-20">
                    <CardHeader>
                      <CardTitle className="leading-snug">
                        {s.label && <span className="mr-2 font-mono text-sm text-muted-foreground">{s.label}</span>}
                        {s.judul}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{LABEL_TIPE[s.tipe] ?? s.tipe}</Badge>
                        {t != null && <span>target ± {formatAngka(t, 0)} kata</span>}
                        <span className="font-mono text-xs">{s.kode}</span>
                      </CardDescription>
                      {s.tipe !== "data" && s.tipe !== "otomatis" && (
                        <CardAction>
                          <TombolSegera label={s.butir.length ? "Generate butir" : "Generate"} ikon="generate" />
                        </CardAction>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      {v && (
                        <div className="rounded-lg border-l-4 border-primary/40 bg-muted/50 p-4 text-sm">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Instruksi template</div>
                          <p className="whitespace-pre-line">{gantiLabelTS(v.instruksi, ts)}</p>
                          {v.catatanTemplate && <p className="mt-2 text-xs italic text-muted-foreground">{v.catatanTemplate}</p>}
                        </div>
                      )}

                      {s.butir.map((b) => (
                        <div key={b.id} className="rounded-lg border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Butir {b.kode} · {b.elemen}</div>
                              <div className="font-medium leading-snug">{gantiLabelTS(b.indikator, ts)}</div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <Badge variant="secondary">bobot {formatAngka(Number(b.bobot))}</Badge>
                              <Badge variant={b.jenis === "angka" ? "default" : "outline"}>{b.jenis}</Badge>
                              {b.tabelLkps.map((tb) => <Badge key={tb} variant="outline" className="font-mono">LKPS {tb}</Badge>)}
                            </div>
                          </div>
                          <div className="mt-3 text-sm">
                            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Daftar cek unsur skor 4
                            </div>
                            <ul className="space-y-1.5">
                              {b.unsurSkor4.map((u, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px] text-muted-foreground">
                                    {idx + 1}
                                  </span>
                                  <span>{gantiLabelTS(u, ts)}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-2 text-xs text-muted-foreground">Status unsur (terpenuhi/sebagian/belum ada bukti) diisi setelah generate.</p>
                          </div>
                        </div>
                      ))}

                      {dokumen.length > 0 && (
                        <div className="text-sm">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dokumen pendukung yang diharapkan</span>
                            <TombolSegera label="Unggah" ikon="unggah" />
                          </div>
                          <ul className="flex flex-wrap gap-1.5">
                            {dokumen.map((d) => <li key={d.id}><Badge variant="outline" className="font-normal">{d.nama}</Badge></li>)}
                          </ul>
                        </div>
                      )}

                      {s.tipe !== "data" && s.tipe !== "otomatis" && (
                        <IsianJawaban
                          proyekId={proyek.id}
                          subBagianKode={s.kode}
                          awal={jawaban[s.kode] ?? ""}
                          pemandu={pemandu.map((x) => gantiLabelTS(x, ts))}
                        />
                      )}

                      {s.tipe !== "otomatis" && (
                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                          {s.tipe === "data"
                            ? "Bagian ini diisi otomatis dari data proyek saat ekspor."
                            : "Draf narasi akan muncul di sini setelah generate, lalu bisa disunting dan dibandingkan antarversi."}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          ))}
        </div>

        <nav aria-label="Daftar sub-bagian" className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100svh-6rem)] overflow-y-auto rounded-lg border p-3 text-sm">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Isi halaman</div>
            <ul className="space-y-1">
              {bagian.subBagian.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.kode}`} className="line-clamp-2 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    {s.label && <span className="mr-1 font-mono text-xs">{s.label}</span>}
                    {s.judul}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
