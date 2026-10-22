import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, Loader2 } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarDokumen } from "@/lib/data/dokumen";
import { nilaiButirProyek } from "@/lib/data/nilai-butir";
import { bacaVarian, varianUntukJenjang } from "@/lib/domain/instrumen";
import { formatAngka } from "@/lib/domain/teks";
import { gantiLabelTS } from "@/lib/domain/tahun-akademik";
import { LABEL_STATUS_SUB, bagianBerikutnya, persenPosisi, peringatanSebelumGenerate, posisiSub, subDigenerate } from "@/lib/domain/navigasi";
import { STATUS_BERJALAN } from "@/lib/tampil";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TombolGenerate } from "@/components/narasi/tombol-generate";
import { cn } from "@/lib/utils";
import { hrefKriteria, hrefSub, muatKriteria } from "../muat";
import { IsianJawaban } from "../isian-jawaban";
import { DaftarCek, PanelDraf } from "../panel-draf";
import { KotakMetrik } from "../kotak-metrik";
import { IsianNilaiManual } from "../isian-nilai-manual";
import { IsianTarget } from "../isian-target";
import { capaianButirProyek, type CapaianButir } from "@/lib/data/target-butir";
import { teksCapaian, teksTren } from "@/lib/domain/capaian";
import { LABEL_TIPE, LencanaStatusSub } from "../lencana-sub";
import { TautanSimpan } from "../tautan-simpan";

export async function generateMetadata({ params }: PageProps<"/proyek/[proyekId]/bagian/[kode]/[sub]">): Promise<Metadata> {
  const { sub } = await params;
  return { title: decodeURIComponent(sub) };
}

const TERIMA_DOKUMEN = ".pdf,.docx,.png,.jpg,.jpeg,.gif";

function JudulSeksi({ children, aksi }: { children: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</h2>
      {aksi}
    </div>
  );
}

/**
 * Satu sub-bagian satu halaman (revisi 19 Okt 2026). Urutan isi: instruksi template, butir dan daftar cek skor 4,
 * data LKPS, jawaban penyusun, dokumen pendukung, lalu hasil generate dan riwayat versi.
 */
export default async function HalamanSubBagian({ params }: PageProps<"/proyek/[proyekId]/bagian/[kode]/[sub]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId, kode: kodeMentah, sub: subMentah } = await params;
  const kodeSub = decodeURIComponent(subMentah);
  const d = await muatKriteria(p, proyekId, decodeURIComponent(kodeMentah));
  if (!d) notFound();
  const { proyek, bagian, draf, target, statusSub } = d;
  const s = bagian.subBagian.find((x) => x.kode === kodeSub);
  const posisi = posisiSub(bagian.subBagian.map((x) => x.kode), kodeSub);
  if (!s || !posisi) notFound();

  const [semuaDokumen, nilai, capaian] = await Promise.all([daftarDokumen(p, proyekId), nilaiButirProyek(p, proyekId), capaianButirProyek(p, proyekId)]);
  const ts = proyek.tsTahunMulai;
  const digenerate = subDigenerate(s.tipe);
  const v = varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang);
  const t = target[s.kode];
  const drafSub = draf[s.kode] ?? null;
  const terunggah = semuaDokumen.filter((x) => x.subBagianKode === s.kode);
  const nilaiButir = new Map(nilai.daftar.map((n) => [n.butir, n]));
  const gambar = semuaDokumen
    .filter((x) => x.jenis === "gambar" && x.status === "siap")
    .map((x) => ({ id: x.id, judul: x.judul ?? x.namaBerkas, src: `/api/dokumen/${x.id}/berkas` }));
  const adaProses = terunggah.some((x) => STATUS_BERJALAN.includes(x.status));
  // revisi 22 Okt 2026: teks yang sedang ditulis untuk sub-bagian ini (tampil bertahap, diperbarui berkala)
  const sedangDitulis = d.tugasAktif.map((t) => t.pratinjau[s.kode]).find(Boolean) ?? null;
  const ditulisDiTugas = d.tugasAktif.some((t) => t.status === "berjalan" || t.status === "antre");

  const lanjutBagian = bagianBerikutnya(d.urutanBagian.map((b) => b.kode), bagian.kode);
  const namaLanjutBagian = d.urutanBagian.find((b) => b.kode === lanjutBagian)?.nama;
  const keSebelumnya = posisi.sebelumnya
    ? { href: hrefSub(proyek.id, bagian.kode, posisi.sebelumnya), label: "Sebelumnya" }
    : { href: hrefKriteria(proyek.id, bagian.kode), label: `Ringkasan ${bagian.kode}` };
  const keBerikutnya = posisi.berikutnya
    ? { href: hrefSub(proyek.id, bagian.kode, posisi.berikutnya), label: "Berikutnya" }
    : lanjutBagian
      ? { href: hrefKriteria(proyek.id, lanjutBagian), label: `Berikutnya: ${lanjutBagian}${namaLanjutBagian ? ` ${namaLanjutBagian}` : ""}` }
      : { href: `/proyek/${proyek.id}/ekspor`, label: "Selesai: ke Ekspor Word" };

  const tombolGenerate = digenerate && (
    <TombolGenerate
      proyekId={proyek.id}
      bagianKode={bagian.kode}
      subBagianKode={s.kode}
      label={drafSub?.aktif ? "Generate ulang" : "Generate"}
      sudahAda={Boolean(drafSub?.aktif)}
      nonaktif={d.tugasAktif.length > 0}
      peringatan={peringatanSebelumGenerate(s.kode, d.jumlahDrafIku)}
    />
  );

  return (
    <>
      <PemantauProses aktif={adaProses || ditulisDiTugas} detik={ditulisDiTugas ? 2 : 3} />
      <JudulHalaman
        judul={
          <span className="leading-snug">
            {s.label && <span className="mr-2 font-mono text-muted-foreground">{s.label}</span>}
            {s.judul}
          </span>
        }
        deskripsi={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <span className="font-mono">{bagian.kode}</span> · {posisi.nomor} dari {posisi.total} · {bagian.nama}
            </span>
            <Badge variant="outline">{LABEL_TIPE[s.tipe] ?? s.tipe}</Badge>
            {t != null && <span>target ± {formatAngka(t, 0)} kata</span>}
          </span>
        }
        remah={[
          { label: "Beranda", href: `/proyek/${proyek.id}` },
          { label: bagian.kode, href: hrefKriteria(proyek.id, bagian.kode) },
          { label: s.label || `${posisi.nomor} dari ${posisi.total}` },
        ]}
        aksi={
          <>
            <LencanaStatusSub status={statusSub[s.kode]} />
            {tombolGenerate}
          </>
        }
      />
      <Progress value={persenPosisi(posisi)} aria-label={`Sub-bagian ${posisi.nomor} dari ${posisi.total}`} className="h-1.5" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {v && (
            <section className="rounded-lg border-l-4 border-primary/40 bg-muted/50 p-4 text-sm" aria-label="Instruksi template">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Instruksi template</div>
              <p className="whitespace-pre-line">{gantiLabelTS(v.instruksi, ts)}</p>
              {v.catatanTemplate && <p className="mt-2 text-xs italic text-muted-foreground">{v.catatanTemplate}</p>}
            </section>
          )}

          {s.butir.length > 0 && (
            <section aria-label="Butir penilaian">
              <JudulSeksi>Butir penilaian</JudulSeksi>
              <div className="flex flex-col gap-3">
                {s.butir.map((b) => (
                  <div key={b.id} className="flex flex-col gap-3 rounded-lg border p-4">
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
                    <details className="text-sm">
                      <summary className="cursor-pointer select-none text-xs text-muted-foreground">Deskriptor skor 4 (resmi)</summary>
                      <p className="mt-1 whitespace-pre-line">{gantiLabelTS(b.deskriptorSkor4, ts)}</p>
                    </details>
                    <DaftarCek
                      butir={[{ kode: b.kode, unsur: b.unsurSkor4.map((u) => gantiLabelTS(u, ts)) }]}
                      unsur={drafSub?.aktif?.unsur ?? []}
                    />
                    {b.jenis === "angka" && (() => {
                      const n = nilaiButir.get(b.kode);
                      return (
                        <>
                          {(n?.sumber === "rumus" || (n?.kodeRumus && !nilai.adaLkps)) && (
                            <KotakMetrik hasil={n?.sumber === "rumus" ? n.hasil ?? undefined : undefined} perluDicek={nilai.perluDicek} proyekId={proyek.id} />
                          )}
                          {n?.perluManual && (
                            <IsianNilaiManual
                              proyekId={proyek.id}
                              butirKode={b.kode}
                              awal={{ nilai: n.manual?.nilai ?? "", keterangan: n.manual?.keterangan ?? "" }}
                              alasan={n.alasan}
                            />
                          )}
                          <CapaianDanTren c={capaian.get(b.kode)} />
                          <IsianTarget
                            key={`target-${b.kode}`}
                            proyekId={proyek.id}
                            butirKode={b.kode}
                            awal={{
                              target: capaian.get(b.kode)?.target?.target ?? "", satuan: capaian.get(b.kode)?.target?.satuan ?? "",
                              sumber: capaian.get(b.kode)?.target?.sumber ?? "", lebihKecil: capaian.get(b.kode)?.target?.lebihKecil ?? false,
                            }}
                          />
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </section>
          )}

          {!digenerate && (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              {s.tipe === "data"
                ? "Sub-bagian ini diisi otomatis dari data proyek (LKPS, identitas, tim penyusun) saat ekspor Word."
                : "Sub-bagian ini disusun otomatis oleh sistem saat ekspor Word."}
            </div>
          )}

          {digenerate && (
            <section aria-label="Jawaban penyusun">
              <IsianJawaban key={s.kode} proyekId={proyek.id} subBagianKode={s.kode} awal={d.jawaban[s.kode] ?? ""} />
            </section>
          )}

          {digenerate && (
            <section aria-label="Dokumen pendukung" className="text-sm">
              <JudulSeksi
                aksi={
                  <UnggahBerkas
                    ringkas
                    multiple
                    label="Unggah dokumen"
                    accept={TERIMA_DOKUMEN}
                    url={`/api/proyek/${proyek.id}/dokumen`}
                    isian={{ subBagianKode: s.kode, butirKode: s.butir[0]?.kode }}
                  />
                }
              >
                Dokumen pendukung{terunggah.length > 0 ? ` · ${terunggah.length}` : ""}
              </JudulSeksi>
              {terunggah.length > 0 ? (
                <ul className="space-y-1 rounded-lg border p-3">
                  {terunggah.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <FileText className="size-3.5 text-muted-foreground" aria-hidden />
                      <a href={`/api/dokumen/${x.id}/berkas`} target="_blank" rel="noreferrer" className="hover:underline">
                        {x.judul ?? x.namaBerkas}
                      </a>
                      {x.bersama && <Badge variant="outline">bersama fakultas</Badge>}
                      <LencanaProses status={x.status} />
                      {x.pesan && <span className="text-destructive">{x.pesan}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Belum ada dokumen khusus sub-bagian ini. Sistem tetap mencari di semua dokumen LED dan dokumen bersama fakultas.
                </p>
              )}
            </section>
          )}

          {digenerate && (
            <section aria-label="Hasil generate">
              <JudulSeksi aksi={tombolGenerate}>Hasil generate</JudulSeksi>
              {sedangDitulis && (
                <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" aria-live="polite">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />Sedang ditulis
                  </div>
                  <div className="whitespace-pre-line text-muted-foreground">{sedangDitulis}</div>
                </div>
              )}
              <PanelDraf
                key={s.kode}
                proyekId={proyek.id}
                subBagianKode={s.kode}
                draf={drafSub}
                butir={[]}
                gambar={gambar}
                tugasAktif={d.sedangDisusun}
              />
            </section>
          )}

          <nav aria-label="Pindah sub-bagian" className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <TautanSimpan
              href={keSebelumnya.href}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {keSebelumnya.label}
            </TautanSimpan>
            <span className="text-xs text-muted-foreground">{posisi.nomor} dari {posisi.total}</span>
            <TautanSimpan
              href={keBerikutnya.href}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {keBerikutnya.label}
              <ArrowRight className="size-4" aria-hidden />
            </TautanSimpan>
          </nav>
        </div>

        <nav aria-label="Daftar sub-bagian" className="order-first xl:order-none">
          <details className="rounded-lg border p-3 text-sm xl:sticky xl:top-20 xl:max-h-[calc(100svh-6rem)] xl:overflow-y-auto" open>
            <summary className="mb-2 cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {bagian.kode} · {posisi.total} sub-bagian
            </summary>
            <ol className="space-y-0.5">
              {bagian.subBagian.map((x, i) => {
                const ini = x.kode === s.kode;
                return (
                  <li key={x.id}>
                    <TautanSimpan
                      href={hrefSub(proyek.id, bagian.kode, x.kode)}
                      aria-current={ini ? "page" : undefined}
                      className={cn(
                        "flex items-start gap-2 rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground",
                        ini && "bg-primary/10 font-medium text-foreground",
                      )}
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-xs leading-5">{i + 1}</span>
                      <span className="line-clamp-2 flex-1">
                        {x.label && <span className="mr-1 font-mono text-xs">{x.label}</span>}
                        {x.judul}
                      </span>
                      <TitikStatus status={statusSub[x.kode]} />
                    </TautanSimpan>
                  </li>
                );
              })}
            </ol>
          </details>
        </nav>
      </div>
    </>
  );
}

/** Capaian terhadap target dan tren tiga tahun (dihitung sistem). */
function CapaianDanTren({ c }: { c: CapaianButir | undefined }) {
  if (!c || (!c.hasil && c.tren.length === 0)) return null;
  return (
    <div className="rounded-md bg-muted/60 p-3 text-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Evaluasi capaian (dihitung sistem)</div>
      {c.hasil && (
        <p className={c.hasil.tercapai ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}>
          {teksCapaian(c.hasil, c.satuanCapaian ?? c.target?.satuan ?? null)}{c.target?.sumber ? ` · target dari ${c.target.sumber}` : ""}
        </p>
      )}
      {c.tren.map((t) => <p key={t.judul} className="text-muted-foreground">{teksTren(t)}</p>)}
    </div>
  );
}

const WARNA_TITIK: Record<string, string> = {
  belum: "bg-muted-foreground/30",
  ada_jawaban: "bg-sky-500",
  ada_draf: "bg-amber-500",
  selesai: "bg-emerald-600",
  data: "border border-muted-foreground/40",
};

function TitikStatus({ status }: { status: keyof typeof LABEL_STATUS_SUB }) {
  return (
    <>
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", WARNA_TITIK[status])} title={LABEL_STATUS_SUB[status]} aria-hidden />
      <span className="sr-only">{LABEL_STATUS_SUB[status]}</span>
    </>
  );
}
