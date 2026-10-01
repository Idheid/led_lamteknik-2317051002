import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GAYA: Record<string, { label: string; kelas: string }> = {
  belum: { label: "Belum diisi", kelas: "bg-muted text-muted-foreground" },
  draf: { label: "Draf", kelas: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  disunting: { label: "Disunting", kelas: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" },
  selesai: { label: "Selesai", kelas: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
};

export function LencanaStatus({ status }: { status: string }) {
  const g = GAYA[status] ?? GAYA.belum;
  return <Badge className={cn("border-transparent", g.kelas)}>{g.label}</Badge>;
}
