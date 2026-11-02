import type { KodeStatusLpmpp, LabelMasa } from "@/modules/led/domain/dashboard";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/modules/bersama/utils";

/** Tampilan bersama Dashboard akreditasi dan Detail prodi (desain form 2 D5). */

export const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });

export const WARNA_MASA: Record<LabelMasa, string> = {
  Berakhir: "text-destructive",
  Kritis: "text-destructive",
  Perhatian: "text-amber-700 dark:text-amber-300",
  Aktif: "text-emerald-700 dark:text-emerald-300",
  "Belum diisi": "text-muted-foreground",
};

export const NADA_STATUS: Record<KodeStatusLpmpp, string> = {
  "belum-ada-led": "border-dashed text-muted-foreground",
  penyusunan: "",
  direview: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
  "perlu-revisi": "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
  layak: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
  "ekspor-final": "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
  "hasil-menunggu": "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
  "hasil-dicatat": "",
};

export function Kelengkapan({ persen, label }: { persen: number | null; label: string }) {
  if (persen === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-28 items-center gap-2">
      <Progress value={persen} className="h-2 flex-1" aria-label={`${label} ${persen}%`} />
      <span className={cn("w-10 text-right text-xs tabular-nums", persen >= 100 && "font-medium text-emerald-700 dark:text-emerald-300")}>{persen}%</span>
    </div>
  );
}
