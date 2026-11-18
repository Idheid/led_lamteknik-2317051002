"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/export/page.tsx.
// Gabung LKPS G5: alamat /api/lkps/ekspor, galat { pesan }, kartu "Kirim ke Sistem LED" dibuang.
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Card, Button, Alert, toast). Galat unduh memakai toast (asal:
// alert()). Teks "format baku LKPS_Akademik_Vokasi-1.xlsx siap diajukan ke LAM Teknik" dilunakkan: templat ekspor
// adalah milik modul ini (LKPS_TEMPLAT_EKSPOR, atau buku kerja baru), bukan templat LKPS 2025 yang dibaca LED.

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileSpreadsheet, Info, Loader2 } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks";

export default function HalamanEkspor() {
  const { namaProdi } = useInfoLkps();
  const [downloading, setDownloading] = useState(false);
  const [berhasil, setBerhasil] = useState(false);

  async function unduh() {
    setDownloading(true);
    setBerhasil(false);
    try {
      const res = await fetch("/api/lkps/ekspor");
      if (!res.ok) {
        toast.error((await res.json().catch(() => null))?.pesan || "Gagal mengunduh berkas ekspor.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `LKPS_LAM_Teknik_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBerhasil(true);
    } catch {
      toast.error("Terjadi kendala koneksi saat ekspor.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <JudulHalaman judul="Ekspor Excel" deskripsi="Unduh LKPS program studi aktif sebagai berkas Excel (.xlsx)." />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-emerald-600" aria-hidden />Unduh berkas Excel (.xlsx)</CardTitle>
            <CardDescription>
              Mengisi data LKPS {namaProdi ? <strong className="text-foreground">{namaProdi}</strong> : "prodi aktif"} dari semua kriteria ke lembar kerja Excel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-fit" onClick={() => void unduh()} disabled={downloading}>
              {downloading ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              {downloading ? "Membuat berkas…" : "Unduh LKPS (.xlsx)"}
            </Button>
            {berhasil && (
              <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" aria-hidden />Berkas LKPS berhasil diunduh.
              </p>
            )}
          </CardContent>
        </Card>

        <Alert>
          <Info aria-hidden />
          <AlertTitle>Data LKPS untuk LED</AlertTitle>
          <AlertDescription>
            Data di modul LKPS belum dipakai LED. LED membaca LKPS dari berkas Excel/PDF yang diunggah di <strong>Data LKPS</strong> proyek LED.
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
