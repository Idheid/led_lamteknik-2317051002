"use client";

import { useState } from "react";
import { AlertTriangle, CalendarCheck, CalendarClock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { cn } from "@/lib/utils";
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
        "overflow-hidden rounded-xl border-2 bg-card",
        merah ? "border-rose-400 dark:border-rose-800" : kuning ? "border-amber-300 dark:border-amber-800" : "border-primary/30",
      )}
      aria-label="Jadwal kerja"
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 font-semibold",
          merah ? "bg-rose-600 text-white" : kuning ? "bg-amber-400 text-amber-950" : "bg-primary text-primary-foreground",
        )}
      >
        <h2 className="flex items-center gap-2">
          {merah ? <AlertTriangle className="size-5" aria-hidden /> : <CalendarClock className="size-5" aria-hidden />}
          Jadwal kerja
        </h2>
        <span className="text-sm">
          {terlewat.length > 0 ? `${terlewat.length} jadwal terlewat` : `Akreditasi berakhir ${sisa}`}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 text-sm">
        {ubah ? formulir : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="text-muted-foreground">Batas pengajuan: </span>
                <span className="text-base font-semibold">{batasPengajuan ? tampilTanggal(batasPengajuan) : "belum diisi"}</span>
              </span>
              {!terkunci && <Button variant="outline" onClick={() => setUbah(true)}><CalendarCheck aria-hidden />Ubah jadwal</Button>}
            </div>
            {tonggak.length > 0 ? (
              <ol className="grid gap-2 sm:grid-cols-5" aria-label="Tonggak jadwal kerja">
                {tonggak.map((t) => (
                  <li
                    key={t.kode}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2.5 sm:flex-col sm:items-center sm:text-center",
                      t.status === "terlewat" && "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
                      t.status === "tercapai" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        t.status === "tercapai" ? "bg-emerald-600 text-white" : t.status === "terlewat" ? "bg-rose-600 text-white" : "border-2 border-muted-foreground/30",
                      )}
                    >
                      {t.status === "tercapai" && <Check className="size-4" aria-label="tercapai" />}
                      {t.status === "terlewat" && <X className="size-4" aria-label="terlewat" />}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium leading-snug">{t.nama}</span>
                      <span className={cn("text-xs tabular-nums", t.status === "terlewat" ? "font-semibold text-rose-700 dark:text-rose-300" : "text-muted-foreground")}>
                        {tampilTanggal(t.tanggal)}{t.status === "terlewat" ? " · terlewat" : t.status === "tercapai" ? " · tercapai" : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">Klik Ubah jadwal dan isi batas pengajuan untuk membuat jadwal kerja.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
