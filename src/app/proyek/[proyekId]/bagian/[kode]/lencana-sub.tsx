import { LABEL_STATUS_SUB, type StatusSub } from "@/lib/domain/navigasi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const LABEL_TIPE: Record<string, string> = {
  data: "Diisi dari data", narasi: "Narasi", bersama: "Bagian bersama", iku: "Indikator kinerja", otomatis: "Otomatis",
};

const GAYA_STATUS_SUB: Record<StatusSub, string> = {
  belum: "bg-muted text-muted-foreground",
  ada_jawaban: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  ada_draf: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  selesai: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  data: "bg-muted text-muted-foreground",
};

/** Status satu sub-bagian: belum, ada jawaban, ada draf, selesai, atau dari data. */
export function LencanaStatusSub({ status, className }: { status: StatusSub; className?: string }) {
  return <Badge className={cn("border-transparent", GAYA_STATUS_SUB[status], className)}>{LABEL_STATUS_SUB[status]}</Badge>;
}
