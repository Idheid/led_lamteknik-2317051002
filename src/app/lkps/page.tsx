import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { wajibLogin } from "@/modules/bersama/sesi";
import { berandaLed } from "@/components/shell/menu-peran";
import { daftarProyek } from "@/modules/led/data/proyek";
import { JudulHalaman } from "@/components/judul-halaman";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Data LKPS" };

/**
 * Data LKPS. Desain form 2 (2 Nov 2026): LED dan LKPS satu aplikasi. Selama modul LKPS (Ghalib) belum siap, LKPS
 * diunggah satu kali sebagai berkas (Excel template LKPS LAM Teknik 2025 atau PDF) ke LED aktif prodi, dan data yang
 * sama dipakai LED; jadi menu Data LKPS Tim Prodi langsung membuka Data LKPS LED aktif. Admin UPPS melihat kelengkapan
 * LKPS semua prodi di Dashboard akreditasi. Saat modul LKPS siap (MODUL_LKPS.siap), halaman ini diganti berandanya.
 */
export default async function HalamanLkps() {
  const p = await wajibLogin();
  if (p.peran !== "TIM_PRODI") redirect(berandaLed(p.peran));
  const aktif = (await daftarProyek(p)).find((x) => !x.diarsipkanPada);
  if (aktif) redirect(`/led/${aktif.id}/lkps`);
  return (
    <>
      <JudulHalaman judul="Data LKPS" deskripsi="Laporan Kinerja Program Studi untuk LED prodi Anda." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-primary" aria-hidden />Belum ada LED aktif</CardTitle>
          <CardDescription>
            Data LKPS diunggah sekali (Excel template LKPS LAM Teknik 2025 atau PDF per tabel) dan langsung dipakai LED. Mulai LED
            prodi dulu supaya TS (tahun data LKPS) diketahui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/led">Buka LED prodi</Link></Button>
        </CardContent>
      </Card>
    </>
  );
}
