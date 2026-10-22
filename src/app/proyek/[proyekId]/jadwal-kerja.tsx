"use client";

import { useState } from "react";
import { CalendarCheck, CheckCircle2, CircleAlert, Clock } from "lucide-react";
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
  proyekId, batasPengajuan, usulanBatas, tonggak, terkunci,
}: {
  proyekId: string;
  batasPengajuan: string | null;
  usulanBatas: string | null;
  tonggak: TonggakTampil[];
  terkunci: boolean;
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

  if (ubah) {
    return (
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
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="text-muted-foreground">Batas pengajuan: </span>
          <span className="font-medium">{batasPengajuan ? tampilTanggal(batasPengajuan) : "belum diisi"}</span>
        </span>
        {!terkunci && <Button size="sm" variant="outline" onClick={() => setUbah(true)}><CalendarCheck aria-hidden />Ubah jadwal</Button>}
      </div>
      {tonggak.length > 0 ? (
        <ol className="divide-y rounded-lg border">
          {tonggak.map((t) => (
            <li key={t.kode} className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-2", t.status === "terlewat" && "bg-rose-50 dark:bg-rose-950/40")}>
              <span className="flex items-center gap-2">
                {t.status === "tercapai" && <CheckCircle2 className="size-4 text-emerald-600" aria-label="tercapai" />}
                {t.status === "terlewat" && <CircleAlert className="size-4 text-rose-600" aria-label="terlewat" />}
                {t.status === "mendatang" && <Clock className="size-4 text-muted-foreground" aria-label="mendatang" />}
                {t.nama}
              </span>
              <span className={cn("text-xs tabular-nums", t.status === "terlewat" ? "font-medium text-rose-700 dark:text-rose-300" : "text-muted-foreground")}>
                {tampilTanggal(t.tanggal)}{t.diubah ? " (diubah)" : ""}{t.status === "terlewat" ? " · terlewat" : t.status === "tercapai" ? " · tercapai" : ""}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">Isi batas pengajuan untuk membuat tonggak kerja yang dihitung mundur.</p>
      )}
    </div>
  );
}
