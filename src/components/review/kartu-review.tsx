import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, MessageSquareText } from "lucide-react";
import { formatAngka } from "@/lib/domain/teks";
import { LABEL_REVIEW, type StatusReview } from "@/lib/domain/kesiapan";
import { bolehAjukanReview } from "@/lib/domain/review";
import type { BagianPerluReview, KeputusanReview } from "@/lib/data/review";
import { cn } from "@/lib/utils";
import { TombolAjukanReview } from "./tombol-ajukan";

const LANGKAH: StatusReview[] = ["draf", "direview", "layak"];

function Angka({ nilai, label, sorot, href }: { nilai: number; label: string; sorot?: boolean; href?: string }) {
  const isi = (
    <>
      <div className="text-2xl font-semibold tabular-nums leading-tight">{nilai}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </>
  );
  const kelas = cn("rounded-lg border px-3 py-2", sorot && nilai > 0 ? "border-primary/40 bg-primary/5" : "bg-muted/30");
  return href && nilai > 0
    ? <Link href={href} className={cn(kelas, "transition-colors hover:border-primary hover:bg-primary/10")}>{isi}</Link>
    : <div className={kelas}>{isi}</div>;
}

/** Satu baris sub-bagian yang perlu ditinjau; klik membuka halaman sub-bagian tepat di catatannya. */
function BarisBagian({ b }: { b: BagianPerluReview }) {
  return (
    <li>
      <Link
        href={b.href}
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:border-primary hover:bg-primary/5",
          b.terbuka > 0 ? "border-primary/30" : "border-border",
        )}
      >
        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{b.bagianKode}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{b.label && <span className="mr-1.5 font-mono text-muted-foreground">{b.label}</span>}{b.judul}</span>
          <span className="block text-xs text-muted-foreground">
            {b.terbuka > 0 && <span className="font-medium text-primary">{b.terbuka} perlu diperbaiki</span>}
            {b.terbuka > 0 && b.diperbaiki > 0 && " · "}
            {b.diperbaiki > 0 && <span>{b.diperbaiki} menunggu asesor</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          Buka<ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

const BATAS_DAFTAR = 5;

/**
 * Kartu Review asesor di Beranda LED (revisi 23 Okt 2026): pita judul berwarna, langkah status, angka catatan besar,
 * dan tombol Ajukan review yang menonjol, supaya fiturnya terlihat.
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
    <section className="overflow-hidden rounded-xl border-2 border-primary/30 bg-card" aria-label="Review asesor">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
        <h2 className="flex items-center gap-2 font-semibold"><MessageSquareText className="size-5" aria-hidden />Review asesor</h2>
        <span className="rounded-full bg-primary-foreground px-3 py-0.5 text-sm font-semibold text-primary">{LABEL_REVIEW[review]}</span>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <ol className="flex items-center gap-2 text-sm" aria-label="Tahap review">
          {LANGKAH.map((l, i) => (
            <li key={l} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  i < posisi ? "border-emerald-600 bg-emerald-600 text-white" : i === posisi ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {i < posisi ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn("leading-tight", i === posisi ? "font-semibold" : "text-muted-foreground")}>
                {l === "direview" && review === "perlu_revisi" ? "Perlu revisi" : LABEL_REVIEW[l]}
              </span>
              {i < LANGKAH.length - 1 && <span className="hidden h-0.5 flex-1 bg-border sm:block" aria-hidden />}
            </li>
          ))}
        </ol>
        {asesor ? (
          <p className="text-sm">Asesor: <span className="font-medium">{asesor}</span></p>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />Admin belum menugaskan asesor untuk LED ini.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Angka nilai={catatan.terbuka} label="catatan perlu diperbaiki" sorot href={pertamaTerbuka} />
          <Angka nilai={catatan.diperbaiki} label="menunggu asesor" href={pertamaMenunggu} />
          <Angka nilai={catatan.diterima} label="diterima" />
        </div>
        {bagianPerlu.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Bagian yang perlu ditinjau</h3>
            <ul className="flex flex-col gap-1.5">
              {bagianPerlu.slice(0, BATAS_DAFTAR).map((b) => <BarisBagian key={b.subBagianKode} b={b} />)}
            </ul>
            {bagianPerlu.length > BATAS_DAFTAR && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary">Tampilkan {bagianPerlu.length - BATAS_DAFTAR} bagian lainnya</summary>
                <ul className="mt-1.5 flex flex-col gap-1.5">
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
      </div>
    </section>
  );
}
