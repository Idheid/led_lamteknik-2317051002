import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleAlert, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
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

/** Tonggak pertama yang terlewat dan belum tercapai, atau null. */
export function tonggakTerlewat(k: KesiapanLed) {
  return k.tonggak.find((t) => t.status === "terlewat") ?? null;
}

function Angka({ nilai, label }: { nilai: string; label: string }) {
  return (
    <div className="rounded-lg bg-background/80 px-3 py-2">
      <div className="text-xl font-semibold tabular-nums leading-tight">{nilai}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Kartu satu LED di Semua LED (revisi 23 Okt 2026): seluruh kartu merah bila ada jadwal yang terlewat (atau sisa waktu
 * ≤ 6 bulan dan belum layak), kuning bila ≤ 12 bulan, supaya mudah terlihat; angka kesiapan dibuat besar.
 */
export function KartuLed({ href, nama, prodi, periode, k }: { href: string; nama: string; prodi: string; periode: string; k: KesiapanLed | null }) {
  const terlewat = k ? tonggakTerlewat(k) : null;
  const merah = Boolean(terlewat) || k?.warna === "merah";
  const kuning = !merah && k?.warna === "kuning";
  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-xl border-2 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        merah ? "border-rose-400 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
          : kuning ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-border bg-card hover:border-primary/40",
      )}
    >
      {merah && (
        <div className="flex items-center gap-2 bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {terlewat
            ? `Jadwal terlewat: ${terlewat.nama} (${formatTanggal(terlewat.tanggal)})`
            : `Akreditasi berakhir ${labelSisa(k?.sisaBulan ?? null)}; belum Layak diajukan`}
        </div>
      )}
      {kuning && (
        <div className="flex items-center gap-2 bg-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-950">
          <CalendarClock className="size-4 shrink-0" aria-hidden />Akreditasi berakhir {labelSisa(k?.sisaBulan ?? null)}
        </div>
      )}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-snug">{prodi}</div>
            <div className="text-sm text-muted-foreground">{nama} · {periode}</div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
            Buka<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
        {k && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Angka nilai={k.lkpsPersen === null ? "—" : `${k.lkpsPersen}%`} label="LKPS terisi" />
              <Angka nilai={`${k.sub.draf}/${k.sub.total}`} label="sub-bagian berdraf" />
              <Angka nilai={String(k.sub.selesai)} label="selesai" />
              <Angka nilai={String(k.catatanTerbuka)} label="catatan asesor" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={k.review === "layak" ? "default" : "secondary"}>Review: {LABEL_REVIEW[k.review]}</Badge>
              {!merah && !kuning && <LencanaSisa sisa={k.sisaBulan} warna={k.warna} />}
              {!k.batasPengajuan && <span className="text-sm text-muted-foreground">Batas pengajuan belum diisi</span>}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
