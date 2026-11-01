import type { Metadata } from "next";
import Link from "next/link";
import { Award, Eye, LayoutDashboard } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { LABEL_STATUS_AKUN } from "@/modules/bersama/domain/akreditasi";
import { dataDashboard, type BarisDashboard } from "@/modules/led/data/dashboard";
import { jumlahPerTab, LABEL_STATUS_LPMPP, LABEL_TAB, masukTab, type KodeStatusLpmpp, type LabelMasa, type TabDashboard } from "@/modules/led/domain/dashboard";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/modules/bersama/utils";
import { TombolIngatkan } from "./tombol-ingatkan";

export const metadata: Metadata = { title: "Dashboard akreditasi" };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });

const WARNA_MASA: Record<LabelMasa, string> = {
  Berakhir: "text-destructive",
  Kritis: "text-destructive",
  Perhatian: "text-amber-700 dark:text-amber-300",
  Aktif: "text-emerald-700 dark:text-emerald-300",
  "Belum diisi": "text-muted-foreground",
};

const NADA_STATUS: Record<KodeStatusLpmpp, string> = {
  "belum-ada-led": "border-dashed text-muted-foreground",
  penyusunan: "",
  direview: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
  "perlu-revisi": "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
  layak: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
  "ekspor-final": "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
  "hasil-menunggu": "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
  "hasil-dicatat": "",
};

const TAB: TabDashboard[] = ["semua", "prioritas", "unggul", "review"];

function Kelengkapan({ persen, label }: { persen: number | null; label: string }) {
  if (persen === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-28 items-center gap-2">
      <Progress value={persen} className="h-2 flex-1" aria-label={`${label} ${persen}%`} />
      <span className={cn("w-10 text-right text-xs tabular-nums", persen >= 100 && "font-medium text-emerald-700 dark:text-emerald-300")}>{persen}%</span>
    </div>
  );
}

function Baris({ b }: { b: BarisDashboard }) {
  const akun = LABEL_STATUS_AKUN[b.statusAkun];
  return (
    <TableRow>
      <TableCell className="min-w-52 pl-4 align-top whitespace-normal">
        <div className="font-medium">{b.prodi.namaJenjang} {b.prodi.nama}</div>
        <div className="text-xs text-muted-foreground">{b.prodi.kodePddikti ? `Kode ${b.prodi.kodePddikti}` : "Kode PDDikti belum diisi"}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {b.perluLedBaru && <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">Perlu LED baru</Badge>}
          {akun && <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">{akun}</Badge>}
        </div>
        {b.akun.length > 0 && <div className="mt-1 text-xs text-muted-foreground">{b.akun.length} akun Tim Prodi</div>}
      </TableCell>
      <TableCell className="align-top"><Badge variant="outline">{b.lembaga}</Badge></TableCell>
      <TableCell className="align-top">
        {b.peringkat ? <Badge variant={/unggul/i.test(b.peringkat) ? "default" : "secondary"}>{b.peringkat}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="min-w-36 align-top">
        {b.berlakuSampai && <div className={cn("text-sm font-medium tabular-nums", WARNA_MASA[b.masa.label])}>{fmtTanggal.format(b.berlakuSampai)}</div>}
        <div className="text-xs text-muted-foreground">{b.masa.teks}{b.masa.label !== "Aktif" && b.masa.label !== "Belum diisi" ? ` (${b.masa.label})` : ""}</div>
      </TableCell>
      <TableCell className="align-top"><Kelengkapan persen={b.lkpsPersen} label="Kelengkapan LKPS" /></TableCell>
      <TableCell className="align-top"><Kelengkapan persen={b.ledPersen} label="Kelengkapan LED" /></TableCell>
      <TableCell className="min-w-28 align-top">
        {b.simulasi ? (
          <>
            <div className="text-sm font-medium tabular-nums">{formatAngka(b.simulasi.total)}</div>
            <div className="text-xs text-muted-foreground">{b.simulasi.perkiraan ? `Proyeksi ${b.simulasi.perkiraan}` : "Belum ada proyeksi"}</div>
          </>
        ) : <span className="text-xs text-muted-foreground">Belum dinilai</span>}
      </TableCell>
      <TableCell className="min-w-40 align-top whitespace-normal">
        <Badge variant="outline" className={cn("whitespace-normal", NADA_STATUS[b.status])}>{LABEL_STATUS_LPMPP[b.status]}</Badge>
        {b.led?.asesor && <div className="mt-1 text-xs text-muted-foreground">Reviewer: {b.led.asesor}</div>}
      </TableCell>
      <TableCell className="pr-4 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild size="sm" variant="outline"><Link href={`/pengaturan/prodi/${b.prodi.id}`}>Detail</Link></Button>
          {b.led && <Button asChild size="sm" variant="outline"><Link href={`/led/asesor/${b.led.id}`}><Eye aria-hidden />Lihat LED</Link></Button>}
          {b.bolehCatat && b.led && (
            <Button asChild size="sm"><Link href={`/pengaturan/prodi/${b.prodi.id}/akreditasi?led=${b.led.id}`}><Award aria-hidden />Catat hasil</Link></Button>
          )}
          {b.perluLedBaru && b.akun.length > 0 && <TombolIngatkan prodiId={b.prodi.id} />}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Dashboard akreditasi Fakultas/UPPS (desain form 2, 2 Nov 2026; menggantikan Pantau LED): matriks kinerja dan kesiapan
 * seluruh program studi, dengan tab Semua Prodi, Prioritas Re-akreditasi, Sudah Unggul, dan Dalam Review LPMPP.
 */
export default async function HalamanDashboard({ searchParams }: PageProps<"/dashboard">) {
  const p = await wajibAdmin();
  const { tab: tabMentah } = (await searchParams) as { tab?: string };
  const tab: TabDashboard = TAB.includes(tabMentah as TabDashboard) ? (tabMentah as TabDashboard) : "semua";
  const [baris, fakultas] = await Promise.all([dataDashboard(p), ambilFakultas()]);
  const jumlah = jumlahPerTab(baris);
  const tampil = baris.filter((b) => masukTab(b, tab));

  return (
    <>
      <JudulHalaman
        judul={<span className="flex items-center gap-2"><LayoutDashboard className="size-6 text-primary" aria-hidden />Dashboard akreditasi</span>}
        deskripsi={`Matriks kinerja dan kesiapan akreditasi seluruh program studi ${fakultas?.nama ?? "fakultas"}.`}
      />
      <Petunjuk
        kunci="admin-dashboard"
        fungsi="Memantau kesiapan akreditasi semua prodi: masa berlaku, kelengkapan LKPS dan LED, simulasi nilai, dan status review LPMPP."
        langkah={[
          "Tab Prioritas Re-akreditasi: prodi yang akreditasinya berakhir 18 bulan lagi atau kurang, atau perlu LED baru. Ingatkan Tim Prodinya dari kolom Aksi.",
          "Kelengkapan LKPS dari berkas LKPS yang diunggah ke LED; kelengkapan LED dari sub-bagian yang sudah berdraf (selesai dihitung penuh).",
          "Simulasi asesor = Σ bobot × skor (skor reviewer LPMPP bila ada, selain itu skor otomatis); bukan nilai resmi LAM.",
          "Setelah SK akreditasi keluar, klik Catat hasil. Tanggal berakhir, lembaga, dan peringkat diambil dari riwayat akreditasi prodi.",
        ]}
      />
      <nav aria-label="Saring prodi" className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <Link
            key={t}
            href={t === "semua" ? "/dashboard" : `/dashboard?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tab === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {LABEL_TAB[t]} <span className="tabular-nums">({jumlah[t]})</span>
          </Link>
        ))}
      </nav>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Program studi & jenjang</TableHead>
                <TableHead>Lembaga akreditasi</TableHead>
                <TableHead>Peringkat</TableHead>
                <TableHead>Masa berlaku</TableHead>
                <TableHead>Kelengkapan LKPS</TableHead>
                <TableHead>Kelengkapan LED</TableHead>
                <TableHead>Simulasi asesor</TableHead>
                <TableHead>Status LPMPP</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tampil.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                    {baris.length === 0
                      ? <>Belum ada program studi. Tambahkan di menu <Link className="text-primary underline" href="/pengaturan/prodi">Program studi</Link>.</>
                      : "Tidak ada prodi di tab ini."}
                  </TableCell>
                </TableRow>
              )}
              {tampil.map((b) => <Baris key={b.prodi.id} b={b} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
