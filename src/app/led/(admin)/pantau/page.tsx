import type { Metadata } from "next";
import Link from "next/link";
import { Award, ClipboardCheck, FolderOpen, UserRound } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { dataDashboard } from "@/modules/led/data/dashboard";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
import { LABEL_STATUS_LPMPP } from "@/modules/led/domain/dashboard";
import { KartuLed } from "@/modules/led/komponen/kesiapan";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Pantau LED prodi" };

/**
 * Pantau LED prodi (desain form 2 D4, atas permintaan Adrianne): beranda modul LED untuk Admin UPPS. Satu kartu per
 * prodi dengan kesiapan, jadwal, review, dan reviewer LPMPP, mirip beranda LED Tim Prodi; kartu membuka LED hanya baca
 * (/led/asesor/[id]). Ringkasan lintas modul (LKPS, masa akreditasi, status LPMPP) tetap di Dashboard akreditasi.
 */
export default async function HalamanPantauLed() {
  const p = await wajibAdmin();
  const baris = await dataDashboard(p);
  const ids = baris.flatMap((b) => (b.led ? [b.led.id] : []));
  const kesiapan = await kesiapanSemua(p, ids);
  const adaLed = baris.filter((b) => b.led);
  const tanpaLed = baris.filter((b) => !b.led);

  return (
    <ShellMenuLed pengguna={p}>
      <JudulHalaman judul="Pantau LED prodi" deskripsi={`${adaLed.length} LED aktif dari ${baris.length} program studi`} />
      <Petunjuk
        kunci="admin-pantau-led"
        fungsi="Memantau penyusunan LED setiap program studi: progres narasi, jadwal, status review, dan reviewer LPMPP. LED disusun Tim Prodi; Admin UPPS hanya membaca."
        langkah={[
          "Kartu merah atau kuning berarti jadwal terlewat atau waktu pengajuan dekat.",
          "Klik kartu untuk membaca LED prodi (hanya baca), atau Penilaian untuk melihat simulasi skor.",
          "Prodi tanpa LED: pastikan prodi punya akun Tim Prodi dan instrumen jenjangnya aktif.",
        ]}
      />
      {baris.length === 0 && (
        <Card className="max-w-2xl">
          <CardContent className="text-sm text-muted-foreground">
            Belum ada program studi. Tambahkan di menu <Link className="text-primary underline" href="/pengaturan/prodi">Program studi</Link>.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {adaLed.map((b) => {
          const led = b.led!;
          return (
            <div key={b.prodi.id} className="flex flex-col gap-2">
              <KartuLed
                href={`/led/asesor/${led.id}`}
                nama={led.nama}
                prodi={`${b.prodi.namaJenjang} ${b.prodi.nama}`}
                periode={`Diajukan ${led.tahunPengajuan}`}
                k={kesiapan.get(led.id) ?? null}
              />
              <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <UserRound className="size-4" aria-hidden />{led.asesor ?? "Reviewer LPMPP belum ditugaskan"}
                </span>
                <Badge variant="outline">{LABEL_STATUS_LPMPP[b.status]}</Badge>
                <span className="ml-auto flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/led/asesor/${led.id}/penilaian`}><ClipboardCheck aria-hidden />Penilaian</Link>
                  </Button>
                  {!led.asesor && (
                    <Button asChild size="sm" variant="outline"><Link href="/admin/penugasan">Tugaskan reviewer</Link></Button>
                  )}
                  {b.bolehCatat && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/pengaturan/prodi/${b.prodi.id}/akreditasi?led=${led.id}`}><Award aria-hidden />Catat hasil</Link>
                    </Button>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {tanpaLed.length > 0 && (
        <Card className="py-0">
          <CardContent className="flex flex-col divide-y px-0">
            <div className="px-5 py-3 text-sm font-medium">Belum ada LED aktif</div>
            {tanpaLed.map((b) => (
              <div key={b.prodi.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <FolderOpen className="size-4 text-muted-foreground" aria-hidden />{b.prodi.namaJenjang} {b.prodi.nama}
                  {b.perluLedBaru && <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">Perlu LED baru</Badge>}
                </span>
                <Link className="text-primary hover:underline" href={b.akun.length ? `/pengaturan/prodi/${b.prodi.id}` : `/admin/akun/tambah?prodi=${b.prodi.id}`}>
                  {b.akun.length ? "Detail prodi" : "Tambah akun Tim Prodi"}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </ShellMenuLed>
  );
}
