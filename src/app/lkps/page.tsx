import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { wajibLogin } from "@/modules/bersama/sesi";
import { daftarProyek } from "@/modules/led/data/proyek";
import { dataDashboard } from "@/modules/led/data/dashboard";
import { ledAsesor } from "@/modules/led/data/review";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "LKPS" };

const SEMENTARA = "Modul LKPS (isian tabel, impor/ekspor Excel, PDF per tabel) sedang disiapkan. Sementara ini LKPS diunggah sekali sebagai berkas (Excel template LKPS LAM Teknik 2025 atau PDF per tabel) ke LED aktif prodi, dan data yang sama dipakai LED.";

/**
 * Beranda modul LKPS (tombol LKPS di kepala halaman). Selama modul LKPS Ghalib belum siap (MODUL_LKPS.siap):
 * - Tim Prodi: langsung ke Data LKPS LED aktif prodinya (unggah sekali, dipakai LED);
 * - Admin UPPS: kelengkapan LKPS semua prodi;
 * - reviewer LPMPP: LED yang ditugaskan, tempat data LKPS-nya dibaca (Penilaian).
 * Saat modul LKPS siap, halaman ini diganti berandanya.
 */
export default async function HalamanLkps() {
  const p = await wajibLogin();

  if (p.peran === "TIM_PRODI") {
    const aktif = (await daftarProyek(p)).find((x) => !x.diarsipkanPada);
    if (aktif) redirect(`/led/${aktif.id}/lkps`);
    return (
      <>
        <JudulHalaman judul="Data LKPS" deskripsi="Laporan Kinerja Program Studi untuk prodi Anda." />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-primary" aria-hidden />Belum ada LED aktif</CardTitle>
            <CardDescription>{SEMENTARA} Mulai LED prodi dulu supaya TS (tahun data LKPS) diketahui.</CardDescription>
          </CardHeader>
          <CardContent><Button asChild><Link href="/led">Buka LED prodi</Link></Button></CardContent>
        </Card>
      </>
    );
  }

  if (p.peran === "ASESOR") {
    const led = (await ledAsesor(p)).filter((l) => !l.diarsipkanPada);
    return (
      <>
        <JudulHalaman judul="Data LKPS" deskripsi="Data LKPS prodi pada LED yang ditugaskan kepada Anda." />
        <Alert><FileSpreadsheet aria-hidden /><AlertTitle>Modul LKPS sedang disiapkan</AlertTitle><AlertDescription>{SEMENTARA} Angka LKPS tampil di halaman Penilaian setiap LED.</AlertDescription></Alert>
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col divide-y px-0">
            {led.length === 0 && <p className="px-6 py-4 text-sm text-muted-foreground">Belum ada LED yang ditugaskan.</p>}
            {led.map((l) => (
              <Link key={l.id} href={`/led/asesor/${l.id}/penilaian`} className="flex items-center justify-between px-6 py-3 text-sm hover:bg-muted/60">
                <span>{l.prodi.nama} · {namaJenjang(l.jenjang)}</span><span className="text-xs text-primary">Penilaian →</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </>
    );
  }

  if (p.peran !== "ADMIN") redirect("/");
  const baris = await dataDashboard(p);
  return (
    <>
      <JudulHalaman judul="Kelengkapan LKPS prodi" deskripsi="Laporan Kinerja Program Studi semua prodi di fakultas." />
      <Petunjuk
        kunci="admin-lkps"
        fungsi="Kelengkapan tabel LKPS setiap prodi untuk LED aktifnya. Data ini juga tampil di Dashboard akreditasi (fitur bersama)."
        langkah={[SEMENTARA, "Persentase dihitung dari tabel LKPS yang terisi untuk jenjang prodi."]}
      />
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Program studi</TableHead>
                <TableHead>LED aktif</TableHead>
                <TableHead>Kelengkapan LKPS</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.map((b) => (
                <TableRow key={b.prodi.id}>
                  <TableCell className="pl-4 font-medium">{b.prodi.namaJenjang} {b.prodi.nama}</TableCell>
                  <TableCell className="text-sm">{b.led ? b.led.nama : <span className="text-muted-foreground">Belum ada LED aktif</span>}</TableCell>
                  <TableCell>
                    {b.lkpsPersen === null
                      ? <span className="text-xs text-muted-foreground">{b.led ? "Belum diunggah" : "—"}</span>
                      : (
                        <div className="flex min-w-40 items-center gap-2">
                          <Progress value={b.lkpsPersen} className="h-2 flex-1" aria-label={`Kelengkapan LKPS ${b.lkpsPersen}%`} />
                          <span className="w-10 text-right text-xs tabular-nums">{b.lkpsPersen}%</span>
                        </div>
                      )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {b.led && <Button asChild size="sm" variant="outline"><Link href={`/led/asesor/${b.led.id}/penilaian`}>Lihat</Link></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
