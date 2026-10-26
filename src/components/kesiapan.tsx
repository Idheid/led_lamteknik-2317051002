import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleAlert, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import type { KesiapanLed } from "@/lib/data/kesiapan";
import { LABEL_REVIEW, kalimatSisa, labelSisa, type WarnaKesiapan } from "@/lib/domain/kesiapan";
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

/** Pil status kecil berwarna lembut (gaya minimalis, revisi 26 Okt 2026). */
export function Pil({ warna, children }: { warna: "merah" | "kuning" | "hijau" | "biru" | "abu"; children: React.ReactNode }) {
  const kelas = {
    merah: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    kuning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    hijau: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    biru: "bg-primary/10 text-primary",
    abu: "bg-muted text-muted-foreground",
  }[warna];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", kelas)}>{children}</span>;
}

function Statistik({ label, nilai, sub }: { label: string; nilai: string; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums tracking-tight">{nilai}</div>
      {sub}
    </div>
  );
}

/**
 * Kartu satu LED di Semua LED (revisi 26 Okt 2026, gaya minimalis): kartu putih bersudut besar; bila ada jadwal
 * terlewat kartu bernuansa merah lembut dengan pil merah dan nama jadwalnya, kuning bila sisa waktu ≤ 12 bulan.
 */
export function KartuLed({ href, nama, prodi, periode, k }: { href: string; nama: string; prodi: string; periode: string; k: KesiapanLed | null }) {
  const terlewat = k?.tonggak.filter((t) => t.status === "terlewat") ?? [];
  const merah = terlewat.length > 0 || k?.warna === "merah";
  const kuning = !merah && k?.warna === "kuning";
  const persenDraf = k && k.sub.total ? Math.round((k.sub.draf / k.sub.total) * 100) : 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        merah ? "border-rose-200 bg-linear-to-br from-rose-50 to-card dark:border-rose-900 dark:from-rose-950/50"
          : kuning ? "border-amber-200 bg-linear-to-br from-amber-50 to-card dark:border-amber-900 dark:from-amber-950/40"
            : "bg-card hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold tracking-tight">{prodi}</div>
          <div className="truncate text-sm text-muted-foreground">{nama} · {periode}</div>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-2">
        {terlewat.length > 0 && <Pil warna="merah"><AlertTriangle className="size-3.5" aria-hidden />{terlewat.length} jadwal terlewat</Pil>}
        {merah && !terlewat.length && <Pil warna="merah"><CalendarClock className="size-3.5" aria-hidden />{kalimatSisa(k?.sisaBulan ?? null)}</Pil>}
        {kuning && <Pil warna="kuning"><CalendarClock className="size-3.5" aria-hidden />{kalimatSisa(k?.sisaBulan ?? null)}</Pil>}
        {k && <Pil warna={k.review === "layak" ? "hijau" : k.review === "perlu_revisi" ? "kuning" : "biru"}>Review: {LABEL_REVIEW[k.review]}</Pil>}
        {k?.catatanTerbuka ? <Pil warna="kuning"><MessageSquareWarning className="size-3.5" aria-hidden />{k.catatanTerbuka} catatan asesor</Pil> : null}
      </div>
      {terlewat.length > 0 && (
        <p className="text-sm text-rose-700 dark:text-rose-300">
          Terlewat: {terlewat[0].nama} ({formatTanggal(terlewat[0].tanggal)}){terlewat.length > 1 ? ` · +${terlewat.length - 1} lainnya` : ""}
        </p>
      )}
      {k && (
        <div className="grid grid-cols-3 gap-4 border-t pt-4">
          <Statistik label="LKPS terisi" nilai={k.lkpsPersen === null ? "—" : `${k.lkpsPersen}%`} />
          <Statistik
            label="Narasi berdraf"
            nilai={`${k.sub.draf}/${k.sub.total}`}
            sub={<div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${persenDraf}%` }} /></div>}
          />
          <Statistik label="Selesai" nilai={String(k.sub.selesai)} />
        </div>
      )}
      {k && !k.batasPengajuan && <p className="text-xs text-muted-foreground">Batas pengajuan belum diisi</p>}
    </Link>
  );
}
