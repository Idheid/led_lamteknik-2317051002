"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, Calculator, FileText, Loader2, Save, Trash2, Upload } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/modules/bersama/utils";
import { IkonKriteria } from "@/modules/lkps/komponen/bersama/kriteria-tampil";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";

/**
 * Blok tampilan halaman kriteria LKPS (Gabung LKPS G7), dibuat dari komponen LED untuk menggantikan kelas `.card`,
 * `.score-display`, `.formula-display`, `.empty-state`, `.upload-zone`, dan `confirm()` kode asal
 * (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). Empat hal informatif kode asal dipertahankan di sini: kartu hitungan
 * langsung (`KartuHitung`), tampilan kosong yang memberi arahan (`KosongArahan`), dan ikon berwarna per kriteria
 * (`KartuTabel`); kartu progres ada di beranda.
 */

/** Nada lencana skor 1–4 (kode asal: score-excellent/good/average/poor). */
export function nadaSkor(skor: number): string {
  if (skor >= 4) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (skor >= 3) return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (skor >= 2) return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "bg-destructive/10 text-destructive";
}

export function LencanaSkor({ skor, label, maks = 4 }: { skor: number; label: string; maks?: number }) {
  return (
    <Badge className={cn("h-7 px-2.5 text-sm", nadaSkor(skor))}>
      Skor {skor}/{maks} · {label}
    </Badge>
  );
}

/** Kartu hitungan langsung: berubah saat data di halaman berubah (kode asal: "Real-time"). */
export function KartuHitung({
  judul, deskripsi, skor, rumus, children,
}: { judul: string; deskripsi?: string; skor?: ReactNode; rumus?: ReactNode; children?: ReactNode }) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="size-4 text-primary" aria-hidden />{judul}</CardTitle>
        {deskripsi && <CardDescription>{deskripsi}</CardDescription>}
        {skor && <CardAction>{skor}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rumus && (
          <div className="overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-sm" aria-live="polite">{rumus}</div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/** Angka ringkas di kartu hitungan. */
export function Angka({ label, nilai, nada }: { label: string; nilai: ReactNode; nada?: string }) {
  return (
    <div className="min-w-20">
      <div className={cn("text-2xl font-semibold tabular-nums", nada)}>{nilai}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function BarisAngka({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-3", className)}>{children}</div>;
}

/** Kartu tabel kriteria: ikon berwarna kriteria, judul, deskripsi, tombol aksi di kanan, isi tabel tanpa padding sisi. */
export function KartuTabel({
  nomor, judul, deskripsi, aksi, children,
}: { nomor: number; judul: string; deskripsi?: ReactNode; aksi?: ReactNode; children: ReactNode }) {
  return (
    <Card className="gap-4 py-0">
      <CardHeader className="pt-6">
        <div className="flex items-start gap-3">
          <IkonKriteria nomor={nomor} besar="sm" />
          <div className="flex flex-col gap-1">
            <CardTitle>{judul}</CardTitle>
            {deskripsi && <CardDescription>{deskripsi}</CardDescription>}
          </div>
        </div>
        {aksi && <CardAction className="flex flex-wrap gap-2">{aksi}</CardAction>}
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-2">{children}</CardContent>
    </Card>
  );
}

/** Tampilan kosong yang memberi arahan (kode asal: empty-state). */
export function KosongArahan({ nomor, judul, children }: { nomor: number; judul: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <IkonKriteria nomor={nomor} besar="lg" />
      <div className="text-sm font-medium">{judul}</div>
      {children && <p className="max-w-md text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

/** Tautan bukti (`/api/lkps/bukti?kunci=…`) atau penanda belum ada. */
export function TautanBukti({ url, nama, kosong = "Belum diunggah" }: { url: string | null | undefined; nama?: string | null; kosong?: string }) {
  if (!url) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-800 dark:text-amber-300">
        <AlertCircle aria-hidden />{kosong}
      </Badge>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-48 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
      <FileText className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{nama || "Lihat berkas"}</span>
    </a>
  );
}

/** Nama berkas dari alamat bukti (bagian sesudah UUID di kunci penyimpanan). */
export function namaDariAlamatBukti(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const kunci = new URL(url, "http://x").searchParams.get("kunci") ?? url;
    const akhir = kunci.split("/").pop() ?? kunci;
    return akhir.replace(/^[0-9a-f-]{36}-/, "") || akhir;
  } catch {
    return url.split("/").pop() ?? url;
  }
}

/** Unggah satu bukti ke `/api/lkps/bukti` (prodi aktif); galat tampil sebagai toast lewat kirimLkps. */
export function UnggahBukti({
  accept, label = "Unggah berkas", keterangan, onTerunggah, ringkas = false,
}: { accept: string; label?: string; keterangan?: string; onTerunggah: (url: string, nama: string) => void; ringkas?: boolean }) {
  const [sibuk, setSibuk] = useState(false);
  async function unggah(berkas: File | undefined) {
    if (!berkas) return;
    setSibuk(true);
    try {
      const fd = new FormData();
      fd.append("file", berkas);
      const res = await kirimLkps("/api/lkps/bukti", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) onTerunggah(data.url, berkas.name);
    } finally {
      setSibuk(false);
    }
  }
  const masukan = <input type="file" accept={accept} className="sr-only" onChange={(e) => { void unggah(e.target.files?.[0]); e.target.value = ""; }} />;
  if (ringkas) {
    // varian tombol kecil untuk sel tabel
    return (
      <label className={cn("inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50", sibuk && "pointer-events-none opacity-60")}>
        {sibuk ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {sibuk ? "Mengunggah…" : label}
        {masukan}
      </label>
    );
  }
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center text-sm transition-colors hover:border-primary/50 hover:bg-muted/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        sibuk && "pointer-events-none opacity-60",
      )}
    >
      {sibuk ? <Loader2 className="size-5 animate-spin text-primary" aria-hidden /> : <Upload className="size-5 text-primary" aria-hidden />}
      <span className="font-medium text-primary">{sibuk ? "Mengunggah…" : label}</span>
      {keterangan && <span className="text-muted-foreground">{keterangan}</span>}
      {masukan}
    </label>
  );
}

/** Tombol hapus dengan konfirmasi AlertDialog LED (kode asal: `confirm()`). */
export function TombolHapus({ judul, deskripsi, onHapus, label = "Hapus" }: { judul: string; deskripsi?: string; onHapus: () => void; label?: string }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <Button size="icon" variant="ghost" aria-label={label} onClick={() => setBuka(true)}><Trash2 aria-hidden /></Button>
      <AlertDialog open={buka} onOpenChange={setBuka}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{judul}</AlertDialogTitle>
            {deskripsi && <AlertDialogDescription>{deskripsi}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onHapus}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Tombol simpan dengan status menyimpan. */
export function TombolSimpan({ sibuk, onClick, disabled, children }: { sibuk: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Button onClick={onClick} disabled={sibuk || disabled}>
      {sibuk ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
      {sibuk ? "Menyimpan…" : children}
    </Button>
  );
}

/** Isian angka bulat di sel tabel (kode asal: NumberInput); kosong/tidak sah → 0. */
export function InputAngka({
  value, onChange, label, disabled, min = 0, desimal = false, className,
}: { value: number; onChange: (v: number) => void; label: string; disabled?: boolean; min?: number; desimal?: boolean; className?: string }) {
  return (
    <Input
      type="number" min={min} step={desimal ? "any" : 1} inputMode={desimal ? "decimal" : "numeric"} aria-label={label}
      disabled={disabled} value={value} className={cn("h-8 w-16 min-w-14 px-1.5 text-center tabular-nums", className)}
      onChange={(e) => onChange((desimal ? parseFloat(e.target.value) : parseInt(e.target.value)) || 0)}
    />
  );
}

/** Label TS di tabel per tahun; TS ditonjolkan. */
export function LencanaTahun({ tahun }: { tahun: string }) {
  return <Badge variant={tahun === "TS" ? "default" : "outline"} className="tabular-nums">{tahun}</Badge>;
}
