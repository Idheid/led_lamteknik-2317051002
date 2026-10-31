import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { wajibAsesor } from "@/modules/bersama/sesi";
import { halamanBagian } from "@/modules/led/data/proyek";
import { drafBagian } from "@/modules/led/data/generate";
import { daftarCatatan } from "@/modules/led/data/review";
import { bacaVarian, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { posisiSub, subDigenerate } from "@/modules/led/domain/navigasi";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { RuangAsesor } from "@/modules/led/komponen/review/ruang-asesor";

export async function generateMetadata({ params }: PageProps<"/led/asesor/[proyekId]/bagian/[kode]/[sub]">): Promise<Metadata> {
  return { title: decodeURIComponent((await params).sub) };
}

/** Satu sub-bagian untuk asesor (revisi 22 Okt 2026): instruksi, butir dan deskriptor skor 4, narasi hanya baca, catatan. */
export default async function HalamanSubAsesor({ params }: PageProps<"/led/asesor/[proyekId]/bagian/[kode]/[sub]">) {
  const p = await wajibAsesor();
  const { proyekId, kode: kodeMentah, sub: subMentah } = await params;
  const kode = decodeURIComponent(kodeMentah);
  const kodeSub = decodeURIComponent(subMentah);
  const [h, draf, catatan] = await Promise.all([halamanBagian(p, proyekId, kode), drafBagian(p, proyekId, kode), daftarCatatan(p, proyekId, kodeSub)]);
  if (!h) notFound();
  const urut = h.bagian.subBagian.filter((x) => subDigenerate(x.tipe));
  const s = urut.find((x) => x.kode === kodeSub);
  const posisi = posisiSub(urut.map((x) => x.kode), kodeSub);
  if (!s || !posisi) notFound();
  const ts = h.proyek.tsTahunMulai;
  const v = varianUntukJenjang(bacaVarian(s.varian), h.proyek.jenjang);
  const aktif = draf[s.kode]?.aktif ?? null;
  const href = (k: string) => `/led/asesor/${proyekId}/bagian/${encodeURIComponent(kode)}/${encodeURIComponent(k)}`;

  return (
    <>
      <JudulHalaman
        judul={<span className="leading-snug">{s.label && <span className="mr-2 font-mono text-muted-foreground">{s.label}</span>}{s.judul}</span>}
        deskripsi={<span>{h.bagian.kode} · {posisi.nomor} dari {posisi.total} · {h.bagian.nama}</span>}
        remah={[{ label: "Ringkasan review", href: `/led/asesor/${proyekId}` }, { label: h.bagian.kode, href: `/led/asesor/${proyekId}/bagian/${encodeURIComponent(kode)}` }, { label: s.label || s.kode }]}
        aksi={<Badge variant={catatan.review === "direview" ? "default" : "outline"}>{LABEL_REVIEW[catatan.review]}</Badge>}
      />

      {v && (
        <details className="rounded-lg border-l-4 border-primary/40 bg-muted/50 p-4 text-sm">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">Instruksi template</summary>
          <p className="mt-2 whitespace-pre-line">{gantiLabelTS(v.instruksi, ts)}</p>
        </details>
      )}

      {s.butir.length > 0 && (
        <details className="rounded-lg border p-4 text-sm">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">Butir penilaian dan deskriptor skor 4</summary>
          <div className="mt-2 flex flex-col gap-3">
            {s.butir.map((b) => (
              <div key={b.id}>
                <div className="text-xs text-muted-foreground">Butir {b.kode} · {b.elemen} · bobot {formatAngka(Number(b.bobot))} · {b.jenis}</div>
                <div className="font-medium">{gantiLabelTS(b.indikator, ts)}</div>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{gantiLabelTS(b.deskriptorSkor4, ts)}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {aktif ? (
        <RuangAsesor
          key={`${s.kode}-${aktif.id}`}
          proyekId={proyekId}
          subBagianKode={s.kode}
          versiId={aktif.id}
          isi={aktif.isi}
          catatanAwal={catatan.catatan}
          bolehCatat={catatan.review === "direview"}
        />
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">PJ belum menyusun narasi sub-bagian ini.</p>
      )}

      <nav aria-label="Pindah sub-bagian" className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
        {posisi.sebelumnya
          ? <Link href={href(posisi.sebelumnya)} className="inline-flex h-9 items-center gap-2 rounded-md border px-4 font-medium hover:bg-muted"><ArrowLeft className="size-4" aria-hidden />Sebelumnya</Link>
          : <span />}
        <span className="text-xs text-muted-foreground">{posisi.nomor} dari {posisi.total}</span>
        {posisi.berikutnya
          ? <Link href={href(posisi.berikutnya)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90">Berikutnya<ArrowRight className="size-4" aria-hidden /></Link>
          : <Link href={`/led/asesor/${proyekId}/penilaian`} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90">Ke Penilaian akhir<ArrowRight className="size-4" aria-hidden /></Link>}
      </nav>
    </>
  );
}
