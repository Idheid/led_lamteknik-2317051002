import type { Metadata } from "next";
import Link from "next/link";
import { Construction, FileSpreadsheet, FileText } from "lucide-react";
import { wajibLogin } from "@/modules/bersama/sesi";
import { MODUL_LKPS } from "@/modules/lkps";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "LKPS" };

const RENCANA = [
  "Isian tabel LKPS per program studi sesuai template LKPS LAM Teknik 2025.",
  "Impor dari Excel template LKPS dan ekspor kembali ke Excel.",
  "Ekspor PDF per tabel: tabel lebar dicetak mendatar (landscape) dan kolom tidak terpotong.",
  "ID sinkron One Data Unila di setiap baris yang ditarik; isian manual tetap ada bila data One Data belum lengkap.",
  "Tabel LKPS dibaca langsung oleh modul LED sebagai sumber narasi, tanpa unggah ulang.",
];

/** Beranda LKPS (kerangka 31 Okt 2026). Modul LKPS dikerjakan Ghalib; halaman ini diganti saat modulnya siap. */
export default async function HalamanLkps() {
  const p = await wajibLogin();
  return (
    <>
      <JudulHalaman judul="LKPS" deskripsi="Laporan Kinerja Program Studi: data kinerja prodi dalam tabel-tabel yang menjadi dasar penilaian akreditasi LAM Teknik." />
      {!MODUL_LKPS.siap && (
        <Alert>
          <Construction aria-hidden />
          <AlertTitle>Modul LKPS sedang disiapkan</AlertTitle>
          <AlertDescription>
            Modul ini dibangun terpisah lalu digabung ke website ini (satu login, satu basis data). Data program studi dan
            kunci API di menu Data bersama sudah dipakai bersama LKPS dan LED.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-primary" aria-hidden />Yang akan ada di modul LKPS</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {RENCANA.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </CardContent>
        </Card>
        {p.peran === "PENANGGUNG_JAWAB" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="size-4 text-primary" aria-hidden />Sementara ini</CardTitle>
              <CardDescription>
                Data LKPS untuk menyusun LED diunggah di modul LED: buka LED, lalu menu Data LKPS (Excel template LKPS atau PDF).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline"><Link href="/led">Buka modul LED</Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
