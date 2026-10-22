import { CalendarClock, CheckCircle2, CircleAlert, MessageSquareWarning } from "lucide-react";
import type { KesiapanLed } from "@/lib/data/kesiapan";
import { LABEL_REVIEW, labelSisa, type WarnaKesiapan } from "@/lib/domain/kesiapan";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Kelas garis tepi kartu menurut tanda warna kesiapan (merah: ≤ 6 bulan dan belum layak; kuning: ≤ 12 bulan). */
export function kelasWarna(w: WarnaKesiapan): string {
  return w === "merah" ? "border-l-4 border-l-rose-500" : w === "kuning" ? "border-l-4 border-l-amber-400" : "";
}

export function LencanaSisa({ sisa, warna }: { sisa: number | null; warna: WarnaKesiapan }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        warna === "merah" && "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
        warna === "kuning" && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
      )}
    >
      <CalendarClock className="size-3" aria-hidden />
      {labelSisa(sisa)}
    </Badge>
  );
}

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatTanggal(iso: string): string {
  return fmtTanggal.format(new Date(`${iso}T00:00:00Z`));
}

/** Ringkasan kesiapan satu LED (daftar Semua LED dan Program studi). */
export function RingkasKesiapan({ k, ringkas }: { k: KesiapanLed; ringkas?: boolean }) {
  const berikut = k.tonggak.find((t) => t.status !== "tercapai");
  return (
    <div className={cn("flex flex-col gap-1.5 text-xs text-muted-foreground", ringkas && "gap-1")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>LKPS <span className="font-medium tabular-nums text-foreground">{k.lkpsPersen === null ? "belum diunggah" : `${k.lkpsPersen}%`}</span></span>
        <span className="tabular-nums"><span className="font-medium text-foreground">{k.sub.draf}</span> dari {k.sub.total} berdraf, <span className="font-medium text-foreground">{k.sub.selesai}</span> selesai</span>
        {k.catatanTerbuka > 0 && (
          <span className="flex items-center gap-1 text-amber-800 dark:text-amber-200"><MessageSquareWarning className="size-3.5" aria-hidden />{k.catatanTerbuka} catatan asesor terbuka</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={k.review === "layak" ? "default" : "secondary"}>{LABEL_REVIEW[k.review]}</Badge>
        <LencanaSisa sisa={k.sisaBulan} warna={k.warna} />
        {!ringkas && berikut && (
          <span className={cn("flex items-center gap-1", berikut.status === "terlewat" && "text-rose-700 dark:text-rose-300")}>
            {berikut.status === "terlewat" ? <CircleAlert className="size-3.5" aria-hidden /> : <CheckCircle2 className="size-3.5 opacity-40" aria-hidden />}
            {berikut.nama}: {formatTanggal(berikut.tanggal)}{berikut.status === "terlewat" ? " (terlewat)" : ""}
          </span>
        )}
        {!ringkas && !k.batasPengajuan && <span>Batas pengajuan belum diisi</span>}
      </div>
    </div>
  );
}
