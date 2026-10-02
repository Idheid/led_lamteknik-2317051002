import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileText } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { butirAnggaranProyek, halamanBagian } from "@/lib/data/proyek";
import { daftarDokumen } from "@/lib/data/dokumen";
import { drafBagian, tugasProyek, STATUS_TUGAS_AKTIF } from "@/lib/data/generate";
import { metrikProyek } from "@/lib/data/lkps";
import { formatMetrik } from "@/lib/tampil";
import type { HasilButirAngka } from "@/lib/domain/metrik-lkps";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { STATUS_BERJALAN } from "@/lib/tampil";
import { bacaAnggaran, targetKataSubBagian } from "@/lib/domain/anggaran-proyek";
import { hitungAnggaran } from "@/lib/domain/anggaran";
import { bacaVarian, namaJenjang, varianUntukJenjang } from "@/lib/domain/instrumen";
import { formatAngka } from "@/lib/domain/teks";
import { gantiLabelTS } from "@/lib/domain/tahun-akademik";
import { JudulHalaman } from "@/components/judul-halaman";
import { LencanaStatus } from "@/components/lencana-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Petunjuk } from "@/components/petunjuk";
import { TombolGenerate, TombolTandaiSelesai } from "@/components/narasi/tombol-generate";
import { IsianJawaban } from "./isian-jawaban";
import { PanelDraf } from "./panel-draf";

export async function generateMetadata({ params }: PageProps<"/proyek/[proyekId]/bagian/[kode]">): Promise<Metadata> {
  const { kode } = await params;
  return { title: decodeURIComponent(kode) };
}

const LABEL_TIPE: Record<string, string> = {
  data: "Diisi dari data", narasi: "Narasi", bersama: "Bagian bersama", iku: "Indikator kinerja", otomatis: "Otomatis",
};

const TERIMA_DOKUMEN = ".pdf,.docx,.png,.jpg,.jpeg,.gif";

export default async function HalamanBagianProyek({ params }: PageProps<"/proyek/[proyekId]/bagian/[kode]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId, kode: kodeMentah } = await params;
  const kode = decodeURIComponent(kodeMentah);
  const data = await halamanBagian(p, proyekId, kode);
  if (!data) notFound();
  const { proyek, bagian, jawaban } = data;
  const [{ butir: butirAnggaran }, semuaDokumen, metrik, draf, tugas] = await Promise.all([
    butirAnggaranProyek(p, proyekId), daftarDokumen(p, proyekId), metrikProyek(p, proyekId),
    drafBagian(p, proyekId, kode), tugasProyek(p, proyekId),
  ]);
  const tugasAktif = tugas.filter((t) => STATUS_TUGAS_AKTIF.includes(t.status));
  const gambar = semuaDokumen
    .filter((d) => d.jenis === "gambar" && d.status === "siap")
    .map((d) => ({ id: d.id, judul: d.judul ?? d.namaBerkas, src: `/api/dokumen/${d.id}/berkas` }));
  const dokumenSub = (kodeSub: string) => semuaDokumen.filter((d) => d.subBagianKode === kodeSub);
  const metrikButir = new Map((metrik?.hasil ?? []).map((h) => [h.butir, h]));
  const adaProses = semuaDokumen.some((d) => STATUS_BERJALAN.includes(d.status));
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
  const subGenerate = bagian.subBagian.filter((s) => s.tipe !== "data" && s.tipe !== "otomatis");
  const adaDraf = subGenerate.filter((s) => draf[s.kode]?.aktif).length;
  const sedangDisusun = tugasAktif.some((t) => t.bagianKode === bagian.kode);

  // kelompokkan sub-bagian berurutan menurut grup
  const kelompok: { grup: string | null; sub: typeof bagian.subBagian }[] = [];
  for (const s of bagian.subBagian) {
    const akhir = kelompok[kelompok.length - 1];
    if (akhir && akhir.grup === s.grup) akhir.sub.push(s);
    else kelompok.push({ grup: s.grup, sub: [s] });
  }

  return (
    <>
      <PemantauProses aktif={adaProses} />
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
            {subGenerate.length > 0 && adaDraf === subGenerate.length && (
              <TombolTandaiSelesai proyekId={proyek.id} bagianKode={bagian.kode} selesai={status === "selesai"} />
            )}
            {subGenerate.length > 0 && (
              <TombolGenerate
                proyekId={proyek.id}
                bagianKode={bagian.kode}
                label={`${adaDraf > 0 ? "Generate ulang" : "Generate"} ${bagian.jenis === "kriteria" ? "kriteria" : "bagian"}`}
                sudahAda={adaDraf > 0}
                nonaktif={tugasAktif.length > 0}
              />
            )}
          </>
        }
      />
      <Petunjuk
        kunci="bagian-proyek"
        fungsi={`Halaman penyusunan ${bagian.jenis === "kriteria" ? "kriteria" : "bagian"}: setiap kartu berisi data LKPS, jawaban penyusun, dan dokumen pendukung di atas, lalu hasil generate dan riwayat versinya.`}
        langkah={[
          "Periksa data LKPS tiap butir dan isi Jawaban penyusun dengan fakta yang belum ada di dokumen.",
          "Unggah dokumen pendukung yang diminta (daftar cek dokumen).",
          `Klik ${bagian.jenis === "kriteria" ? "Generate kriteria" : "Generate bagian"}: urutannya indikator kinerja, latar belakang dan kebijakan, analisis faktor, lalu SWOT. Anda boleh meninggalkan halaman selama proses.`,
          "Baca hasil di tab Hasil generate: perhatikan panel pemeriksaan otomatis dan daftar cek skor 4, lalu sunting langsung (tersimpan otomatis).",
          "Bila perlu, klik Generate ulang pada satu sub-bagian, bandingkan atau pulihkan versi di tab Riwayat versi, lalu tandai selesai.",
        ]}
      />
      {subGenerate.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {adaDraf} dari {subGenerate.length} sub-bagian sudah punya draf{sedangDisusun ? " · penyusunan sedang berjalan" : ""}.
        </p>
      )}
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
                const diharapkan = [
                  ...s.dokumenDiharapkan.map((d) => ({ ...d, butirKode: s.butir[0]?.kode ?? null })),
                  ...s.butir.flatMap((b) => b.dokumenDiharapkan.map((d) => ({ ...d, butirKode: b.kode }))),
                ];
                const terunggah = dokumenSub(s.kode);
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
                        <CardAction className="flex items-center gap-2">
                          <LencanaStatus status={draf[s.kode]?.status ?? "belum"} />
                          <TombolGenerate
                            ukuran="sm"
                            proyekId={proyek.id}
                            bagianKode={bagian.kode}
                            subBagianKode={s.kode}
                            label={draf[s.kode]?.aktif ? (s.butir.length ? "Generate ulang butir" : "Generate ulang") : "Generate"}
                            sudahAda={Boolean(draf[s.kode]?.aktif)}
                            nonaktif={tugasAktif.length > 0}
                          />
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
                          <p className="mt-2 text-xs text-muted-foreground">{b.unsurSkor4.length} unsur skor 4 dicek setelah generate (tab Hasil generate).</p>
                          {b.jenis === "angka" && <KotakMetrik hasil={metrikButir.get(b.kode)} perluDicek={metrik?.perluDicek ?? false} proyekId={proyek.id} />}
                        </div>
                      ))}

                      {s.tipe !== "otomatis" && (
                        <div className="text-sm">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Dokumen pendukung
                              {diharapkan.length > 0 &&
                                ` · ${diharapkan.filter((d) => terunggah.some((x) => x.dokumenDiharapkanId === d.id)).length}/${diharapkan.length} terpenuhi`}
                            </span>
                            <UnggahBerkas
                              ringkas
                              multiple
                              label="Unggah dokumen lain"
                              accept={TERIMA_DOKUMEN}
                              url={`/api/proyek/${proyek.id}/dokumen`}
                              isian={{ subBagianKode: s.kode, butirKode: s.butir[0]?.kode }}
                            />
                          </div>
                          {diharapkan.length > 0 && (
                            <ul className="mb-2 divide-y rounded-lg border">
                              {diharapkan.map((d) => {
                                const ada = terunggah.some((x) => x.dokumenDiharapkanId === d.id);
                                return (
                                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                    <span className="flex items-center gap-2">
                                      {ada
                                        ? <CheckCircle2 className="size-4 text-emerald-600" aria-label="sudah ada" />
                                        : <Circle className="size-4 text-muted-foreground" aria-label="belum ada" />}
                                      {d.nama}
                                    </span>
                                    <UnggahBerkas
                                      ringkas
                                      label={ada ? "Tambah" : "Unggah"}
                                      accept={TERIMA_DOKUMEN}
                                      url={`/api/proyek/${proyek.id}/dokumen`}
                                      isian={{ subBagianKode: s.kode, butirKode: d.butirKode, dokumenDiharapkanId: d.id }}
                                    />
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {terunggah.length > 0 && (
                            <ul className="space-y-1">
                              {terunggah.map((d) => (
                                <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                                  <FileText className="size-3.5 text-muted-foreground" aria-hidden />
                                  <a href={`/api/dokumen/${d.id}/berkas`} target="_blank" rel="noreferrer" className="hover:underline">
                                    {d.judul ?? d.namaBerkas}
                                  </a>
                                  <LencanaProses status={d.status} />
                                  {d.pesan && <span className="text-destructive">{d.pesan}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
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

                      {s.tipe === "data" && (
                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                          Bagian ini diisi otomatis dari data proyek saat ekspor.
                        </div>
                      )}
                      {s.tipe !== "data" && s.tipe !== "otomatis" && (
                        <PanelDraf
                          proyekId={proyek.id}
                          subBagianKode={s.kode}
                          draf={draf[s.kode] ?? null}
                          butir={s.butir.map((b) => ({ kode: b.kode, unsur: b.unsurSkor4.map((u) => gantiLabelTS(u, ts)) }))}
                          gambar={gambar}
                          tugasAktif={sedangDisusun}
                        />
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

function KotakMetrik({ hasil, perluDicek, proyekId }: { hasil: HasilButirAngka | undefined; perluDicek: boolean; proyekId: string }) {
  if (!hasil) {
    return (
      <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
        Metrik butir ini dihitung sistem dari LKPS.{" "}
        <a className="text-primary underline" href={`/proyek/${proyekId}/lkps`}>Unggah LKPS</a> untuk melihat nilainya.
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Data LKPS (dihitung sistem){perluDicek ? " · dari PDF, perlu dicek" : ""}</span>
        {hasil.skor !== null && <span className="normal-case">skor perkiraan {formatAngka(hasil.skor, 2)}</span>}
      </div>
      <dl className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {hasil.metrik.map((m) => (
          <div key={m.kode} className="flex justify-between gap-2">
            <dt className={m.kode === hasil.utama ? "font-medium" : "text-muted-foreground"}>{m.nama}</dt>
            <dd className="shrink-0 tabular-nums">{formatMetrik(m)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
