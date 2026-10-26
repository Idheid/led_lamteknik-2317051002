"use client";

import { useState } from "react";
import { AlertTriangle, CalendarCheck, CalendarClock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { cn } from "@/lib/utils";
import { Pil } from "@/components/kesiapan";
import { aksiSimpanJadwal } from "@/app/proyek/aksi";
import type { StatusTonggak } from "@/lib/domain/kesiapan";

interface TonggakTampil {
  kode: string;
  nama: string;
  tanggal: string;
  diubah: boolean;
  status: StatusTonggak;
}

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const tampilTanggal = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

/**
 * Jadwal kerja dihitung mundur dari batas pengajuan (revisi 22 Okt 2026). Tanggal tonggak usulan bisa diubah;
 * kosongkan untuk kembali ke hitungan otomatis. Tonggak yang terlewat dan belum tercapai ditandai merah.
 */
export function JadwalKerja({
  proyekId, batasPengajuan, usulanBatas, tonggak, terkunci, warna, sisa,
}: {
  proyekId: string;
  batasPengajuan: string | null;
  usulanBatas: string | null;
  tonggak: TonggakTampil[];
  terkunci: boolean;
  /** tanda kesiapan: merah ≤ 6 bulan dan belum layak, kuning ≤ 12 bulan */
  warna: "merah" | "kuning" | null;
  /** sisa waktu sampai akreditasi berakhir, mis. "5 bulan lagi" */
  sisa: string;
}) {
  const { sibuk, jalankan } = useAksi();
  const [ubah, setUbah] = useState(false);
  const [batas, setBatas] = useState(batasPengajuan ?? usulanBatas ?? "");
  const [tanggal, setTanggal] = useState<Record<string, string>>(Object.fromEntries(tonggak.filter((t) => t.diubah).map((t) => [t.kode, t.tanggal])));

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    jalankan(() => aksiSimpanJadwal(proyekId, { batasPengajuan: batas || null, jadwal: Object.fromEntries(Object.entries(tanggal).map(([k, v]) => [k, v || null])) }), {
      sukses: "Jadwal kerja disimpan.",
      lalu: () => setUbah(false),
    });
  }

  const formulir = (
      <form onSubmit={simpan} className="flex flex-col gap-3 text-sm">
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-40 font-medium">Batas pengajuan</span>
          <Input type="date" value={batas} onChange={(e) => setBatas(e.target.value)} className="h-8 w-44" />
          {usulanBatas && <span className="text-xs text-muted-foreground">usulan: {tampilTanggal(usulanBatas)} (6 bulan sebelum akreditasi berakhir)</span>}
        </label>
        <p className="text-xs text-muted-foreground">Kosongkan tanggal tonggak untuk memakai hitungan mundur otomatis.</p>
        {tonggak.map((t) => (
          <label key={t.kode} className="flex flex-wrap items-center gap-2">
            <span className="w-40 text-muted-foreground">{t.nama}</span>
            <Input
              type="date"
              value={tanggal[t.kode] ?? ""}
              placeholder={t.tanggal}
              onChange={(e) => setTanggal((x) => ({ ...x, [t.kode]: e.target.value }))}
              className="h-8 w-44"
            />
            {!tanggal[t.kode] && <span className="text-xs text-muted-foreground">otomatis: {tampilTanggal(t.tanggal)}</span>}
          </label>
        ))}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={sibuk}><IkonSibuk sibuk={sibuk} />Simpan</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setUbah(false)}>Batal</Button>
        </div>
      </form>
  );


  const terlewat = tonggak.filter((t) => t.status === "terlewat");
  const merah = terlewat.length > 0 || warna === "merah";
  const kuning = !merah && warna === "kuning";
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-2xl border p-5 shadow-xs",
        merah ? "border-rose-200 bg-linear-to-br from-rose-50 to-card dark:border-rose-900 dark:from-rose-950/50"
          : kuning ? "border-amber-200 bg-linear-to-br from-amber-50 to-card dark:border-amber-900 dark:from-amber-950/40" : "bg-card",
      )}
      aria-label="Jadwal kerja"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-base font-semibold">
          <span className={cn("flex size-9 items-center justify-center rounded-full", merah ? "bg-rose-100 text-rose-600 dark:bg-rose-950" : "bg-primary/10 text-primary")}>
            <CalendarClock className="size-4.5" aria-hidden />
          </span>
          Jadwal kerja
        </h2>
        {terlewat.length > 0
          ? <Pil warna="merah"><AlertTriangle className="size-3.5" aria-hidden />{terlewat.length} jadwal terlewat</Pil>
          : <Pil warna={kuning ? "kuning" : "abu"}>Akreditasi berakhir {sisa}</Pil>}
      </div>
      {ubah ? formulir : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Batas pengajuan</div>
              <div className="text-xl font-semibold tracking-tight">{batasPengajuan ? tampilTanggal(batasPengajuan) : "Belum diisi"}</div>
            </div>
            {!terkunci && <Button variant="outline" size="sm" className="rounded-full" onClick={() => setUbah(true)}><CalendarCheck aria-hidden />Ubah jadwal</Button>}
          </div>
          {tonggak.length > 0 ? (
            <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Tonggak jadwal kerja">
              {tonggak.map((t, i) => (
                <li key={t.kode} className="flex gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
                  <div className="flex items-center sm:w-full">
                    <span className={cn("hidden h-px flex-1 sm:block", i === 0 ? "bg-transparent" : "bg-border")} aria-hidden />
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        t.status === "tercapai" ? "bg-emerald-500 text-white"
                          : t.status === "terlewat" ? "bg-rose-500 text-white ring-4 ring-rose-500/15"
                            : "border-2 border-border bg-card",
                      )}
                    >
                      {t.status === "tercapai" && <Check className="size-3.5" aria-label="tercapai" />}
                      {t.status === "terlewat" && <X className="size-3.5" aria-label="terlewat" />}
                    </span>
                    <span className={cn("hidden h-px flex-1 sm:block", i === tonggak.length - 1 ? "bg-transparent" : "bg-border")} aria-hidden />
                  </div>
                  <div className="flex flex-col sm:px-1">
                    <span className="text-sm font-medium leading-snug">{t.nama}</span>
                    <span className={cn("text-xs tabular-nums", t.status === "terlewat" ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                      {tampilTanggal(t.tanggal)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Klik Ubah jadwal dan isi batas pengajuan untuk membuat jadwal kerja.</p>
          )}
        </>
      )}
    </section>
  );
}
