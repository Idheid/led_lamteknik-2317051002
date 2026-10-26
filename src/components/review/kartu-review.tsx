import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, MessageSquareText } from "lucide-react";
import { formatAngka } from "@/lib/domain/teks";
import { LABEL_REVIEW, type StatusReview } from "@/lib/domain/kesiapan";
import { bolehAjukanReview } from "@/lib/domain/review";
import type { BagianPerluReview, KeputusanReview } from "@/lib/data/review";
import { Pil } from "@/components/kesiapan";
import { cn } from "@/lib/utils";
import { TombolAjukanReview } from "./tombol-ajukan";

const LANGKAH: StatusReview[] = ["draf", "direview", "layak"];

function Angka({ nilai, label, sorot, href }: { nilai: number; label: string; sorot?: boolean; href?: string }) {
  const isi = (
    <>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-semibold tabular-nums tracking-tight", sorot && nilai > 0 && "text-primary")}>{nilai}</div>
    </>
  );
  const kelas = "rounded-xl bg-muted/50 px-3 py-2.5";
  return href && nilai > 0
    ? <Link href={href} className={cn(kelas, "transition-colors hover:bg-primary/10")}>{isi}</Link>
    : <div className={kelas}>{isi}</div>;
}

/** Satu baris sub-bagian yang perlu ditinjau; klik membuka halaman sub-bagian tepat di catatannya. */
function BarisBagian({ b }: { b: BagianPerluReview }) {
  return (
    <li>
      <Link href={b.href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
        <span className={cn("size-2 shrink-0 rounded-full", b.terbuka > 0 ? "bg-primary" : "bg-amber-400")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            <span className="mr-1.5 font-mono text-xs text-muted-foreground">{b.bagianKode}{b.label ? ` ${b.label}` : ""}</span>{b.judul}
          </span>
          <span className="block text-xs text-muted-foreground">
            {b.terbuka > 0 && `${b.terbuka} perlu diperbaiki`}
            {b.terbuka > 0 && b.diperbaiki > 0 && " · "}
            {b.diperbaiki > 0 && `${b.diperbaiki} menunggu asesor`}
          </span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
      </Link>
    </li>
  );
}

const BATAS_DAFTAR = 5;

/**
 * Kartu Review asesor di Beranda LED (revisi 26 Okt 2026, gaya minimalis): judul dengan ikon bulat, pil status,
 * langkah review berupa titik bergaris, angka catatan, dan daftar bagian yang perlu ditinjau.
 */
export function KartuReview({ proyekId, asesor, review, catatan, keputusan, arsip, bagianPerlu }: {
  proyekId: string;
  asesor: string | null;
  review: StatusReview;
  catatan: { terbuka: number; diperbaiki: number; diterima: number };
  keputusan: KeputusanReview | null;
  arsip: boolean;
  /** revisi 26 Okt 2026: sub-bagian dengan catatan belum selesai, klik langsung ke catatannya */
  bagianPerlu: BagianPerluReview[];
}) {
  const pertamaTerbuka = bagianPerlu.find((b) => b.terbuka > 0)?.href;
  const pertamaMenunggu = bagianPerlu.find((b) => b.diperbaiki > 0)?.href;
  const posisi = review === "perlu_revisi" ? 1 : LANGKAH.indexOf(review);
  return (
    <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs" aria-label="Review asesor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-base font-semibold">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageSquareText className="size-4.5" aria-hidden /></span>
          Review asesor
        </h2>
        <Pil warna={review === "layak" ? "hijau" : review === "perlu_revisi" ? "kuning" : review === "direview" ? "biru" : "abu"}>{LABEL_REVIEW[review]}</Pil>
      </div>

      <ol className="flex items-center" aria-label="Tahap review">
        {LANGKAH.map((l, i) => (
          <li key={l} className={cn("flex items-center", i < LANGKAH.length - 1 && "flex-1")}>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  i < posisi ? "bg-emerald-500 text-white" : i === posisi ? "bg-primary text-primary-foreground ring-4 ring-primary/15" : "bg-muted text-muted-foreground",
                )}
              >
                {i < posisi ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-sm", i === posisi ? "font-semibold" : "text-muted-foreground")}>
                {l === "direview" && review === "perlu_revisi" ? "Perlu revisi" : LABEL_REVIEW[l]}
              </span>
            </span>
            {i < LANGKAH.length - 1 && <span className={cn("mx-3 h-px flex-1", i < posisi ? "bg-emerald-400" : "bg-border")} aria-hidden />}
          </li>
        ))}
      </ol>

      {asesor ? (
        <p className="text-sm text-muted-foreground">Asesor <span className="font-medium text-foreground">{asesor}</span></p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />Admin belum menugaskan asesor untuk LED ini.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Angka nilai={catatan.terbuka} label="Perlu diperbaiki" sorot href={pertamaTerbuka} />
        <Angka nilai={catatan.diperbaiki} label="Menunggu asesor" href={pertamaMenunggu} />
        <Angka nilai={catatan.diterima} label="Diterima" />
      </div>

      {bagianPerlu.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Bagian yang perlu ditinjau</h3>
          <ul className="-mx-2 flex flex-col">
            {bagianPerlu.slice(0, BATAS_DAFTAR).map((b) => <BarisBagian key={b.subBagianKode} b={b} />)}
          </ul>
          {bagianPerlu.length > BATAS_DAFTAR && (
            <details>
              <summary className="cursor-pointer px-1 text-sm font-medium text-primary">+{bagianPerlu.length - BATAS_DAFTAR} bagian lainnya</summary>
              <ul className="-mx-2 mt-1 flex flex-col">
                {bagianPerlu.slice(BATAS_DAFTAR).map((b) => <BarisBagian key={b.subBagianKode} b={b} />)}
              </ul>
            </details>
          )}
        </div>
      )}

      {keputusan && review !== "direview" && (
        <p className="text-sm text-muted-foreground">
          Nilai simulasi asesor <span className="font-medium text-foreground">{formatAngka(keputusan.total)}</span>
          {keputusan.perkiraan ? ` (${keputusan.perkiraan})` : ""}{keputusan.catatan ? `: ${keputusan.catatan}` : ""}
        </p>
      )}
      {bolehAjukanReview(review) && (
        <TombolAjukanReview proyekId={proyekId} ulang={review === "perlu_revisi"} nonaktif={!asesor || arsip} />
      )}
    </section>
  );
}
