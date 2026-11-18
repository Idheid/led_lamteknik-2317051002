import type { Metadata } from "next";
import Link from "next/link";
import { Award, ClipboardCheck, FileSearch, LayoutDashboard } from "lucide-react";
import { wajibPeran } from "@/modules/bersama/sesi";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { LABEL_STATUS_AKUN } from "@/modules/bersama/domain/akreditasi";
import { dataDashboard, dataDashboardTamu, type BarisDashboard, type BarisDashboardTamu } from "@/modules/led/data/dashboard";
import { jumlahPerTab, LABEL_STATUS_LPMPP, LABEL_TAB, masukTab, type TabDashboard } from "@/modules/led/domain/dashboard";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/modules/bersama/utils";
import { TombolIngatkan } from "./tombol-ingatkan";
import { fmtTanggal, Kelengkapan, NADA_STATUS, WARNA_MASA } from "./tampil";

export const metadata: Metadata = { title: "Dashboard akreditasi" };

const TAB: TabDashboard[] = ["semua", "prioritas", "unggul", "review"];

/** Baris Admin memuat akun dan aksi; baris Tamu (Gabung LKPS G2) hanya kolom aman dari dataDashboardTamu. */
function adalahAdmin(b: BarisDashboard | BarisDashboardTamu): b is BarisDashboard {
  return "akun" in b;
}

function Baris({ b }: { b: BarisDashboard | BarisDashboardTamu }) {
  const admin = adalahAdmin(b) ? b : null;
  const akun = admin ? LABEL_STATUS_AKUN[admin.statusAkun] : null;
  return (
    <TableRow>
      <TableCell className="min-w-52 pl-4 align-top whitespace-normal">
        <Link href={`/dashboard/prodi/${b.prodi.id}`} className="font-medium hover:text-primary hover:underline">{b.prodi.namaJenjang} {b.prodi.nama}</Link>
        <div className="text-xs text-muted-foreground">{b.prodi.kodePddikti ? `Kode ${b.prodi.kodePddikti}` : "Kode PDDikti belum diisi"}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {b.perluLedBaru && <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">Perlu LED baru</Badge>}
          {akun && <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">{akun}</Badge>}
        </div>
        {admin && admin.akun.length > 0 && <div className="mt-1 text-xs text-muted-foreground">{admin.akun.length} akun Tim Prodi</div>}
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
        {admin?.led?.asesor && <div className="mt-1 text-xs text-muted-foreground">Reviewer: {admin.led.asesor}</div>}
      </TableCell>
      <TableCell className="pr-4 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild size="sm" variant="outline"><Link href={`/dashboard/prodi/${b.prodi.id}`}><FileSearch aria-hidden />Detail</Link></Button>
          {admin?.led && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/led/asesor/${admin.led.id}/penilaian`}><ClipboardCheck aria-hidden />Review LPMPP</Link>
            </Button>
          )}
          {admin?.bolehCatat && admin.led && (
            <Button asChild size="sm"><Link href={`/pengaturan/prodi/${b.prodi.id}/akreditasi?led=${admin.led.id}`}><Award aria-hidden />Catat hasil</Link></Button>
          )}
          {admin && admin.perluLedBaru && admin.akun.length > 0 && <TombolIngatkan prodiId={b.prodi.id} />}
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
  const p = await wajibPeran("ADMIN", "TAMU");
  const tamu = p.peran === "TAMU";
  const { tab: tabMentah } = (await searchParams) as { tab?: string };
  const tab: TabDashboard = TAB.includes(tabMentah as TabDashboard) ? (tabMentah as TabDashboard) : "semua";
  // Gabung LKPS G2: Tamu memakai varian data tanpa akun, reviewer, dan isian internal (bukan sekadar disembunyikan)
  const [baris, fakultas] = await Promise.all([tamu ? dataDashboardTamu(p) : dataDashboard(p), ambilFakultas()]);
  const jumlah = jumlahPerTab(baris);
  const tampil = baris.filter((b) => masukTab(b, tab));

  return (
    <>
      <JudulHalaman
        judul={<span className="flex items-center gap-2"><LayoutDashboard className="size-6 text-primary" aria-hidden />Dashboard akreditasi</span>}
        deskripsi={`Matriks kinerja dan kesiapan akreditasi seluruh program studi ${fakultas?.nama ?? "fakultas"}.`}
      />
      {tamu ? (
        <Alert>
          <AlertDescription>Anda masuk sebagai Tamu. Untuk menyusun LKPS/LED atau mereview, minta Admin UPPS memberi peran.</AlertDescription>
        </Alert>
      ) : (
      <Petunjuk
        kunci="admin-dashboard"
        fungsi="Memantau kesiapan akreditasi semua prodi: masa berlaku, kelengkapan LKPS dan LED, simulasi nilai, dan status review LPMPP."
        langkah={[
          "Tab Prioritas Re-akreditasi: prodi yang akreditasinya berakhir 18 bulan lagi atau kurang, atau perlu LED baru. Ingatkan Tim Prodinya dari kolom Aksi.",
          "Kelengkapan LKPS dari berkas LKPS yang diunggah ke LED; kelengkapan LED dari sub-bagian yang sudah berdraf (selesai dihitung penuh).",
          "Simulasi asesor = Σ bobot × skor (skor reviewer LPMPP bila ada, selain itu skor otomatis); bukan nilai resmi LAM.",
          "Detail: ringkasan satu prodi (akreditasi, LED, LKPS, review LPMPP, akun) dan pintu masuk ke LED atau data LKPS-nya. Review LPMPP: status review, catatan reviewer, dan simulasi skor.",
          "Setelah SK akreditasi keluar, klik Catat hasil. Tanggal berakhir, lembaga, dan peringkat diambil dari riwayat akreditasi prodi.",
        ]}
      />
      )}
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
                    {baris.length === 0 && tamu
                      ? "Belum ada program studi."
                      : baris.length === 0
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
