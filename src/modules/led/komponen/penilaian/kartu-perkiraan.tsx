import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { formatAngka } from "@/modules/bersama/domain/teks";

/** Kartu paling atas Beranda LED Tim Prodi (revisi 31 Okt 2026): total dan perkiraan status, tautan ke Perkiraan nilai. */
export function KartuPerkiraanNilai({ proyekId, total, maksimum, persen, dinilai, jumlahButir, status }: {
  proyekId: string; total: number; maksimum: number; persen: number; dinilai: number; jumlahButir: number; status: string | null;
}) {
  return (
    <Link
      href={`/led/${proyekId}/penilaian`}
      className="group flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-primary/30 bg-linear-to-br from-primary/5 to-card p-5 shadow-xs transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Gauge className="size-5" aria-hidden /></div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Perkiraan nilai</div>
        <div className="text-3xl font-semibold tabular-nums">{formatAngka(total)} <span className="text-base font-normal text-muted-foreground">/ {formatAngka(maksimum, 0)} · {formatAngka(persen)}%</span></div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Perkiraan status</div>
        <div className="text-lg font-semibold">{status ?? "—"}</div>
      </div>
      <div className="text-sm text-muted-foreground">{dinilai} dari {jumlahButir} butir punya skor</div>
      <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
        Lihat Perkiraan nilai<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
      <p className="w-full text-xs text-muted-foreground">Perkiraan, bukan nilai resmi LAM Teknik. Skor asesor bila ada, selain itu skor otomatis dari rubrik dan LKPS.</p>
    </Link>
  );
}
