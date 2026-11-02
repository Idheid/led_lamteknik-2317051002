import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpen, ClipboardCheck, FileSpreadsheet, History, Pencil, ShieldCheck, Users } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { riwayatAkreditasiProdi } from "@/modules/bersama/data/akreditasi";
import { LABEL_STATUS_AKUN } from "@/modules/bersama/domain/akreditasi";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { dataDashboard } from "@/modules/led/data/dashboard";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
import { LABEL_STATUS_LPMPP } from "@/modules/led/domain/dashboard";
import { RingkasKesiapan } from "@/modules/led/komponen/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/modules/bersama/utils";
import { TombolIngatkan } from "../../tombol-ingatkan";
import { fmtTanggal, Kelengkapan, NADA_STATUS, WARNA_MASA } from "../../tampil";

export const metadata: Metadata = { title: "Detail prodi" };

const fmtLogin = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const LABEL_RIWAYAT: Record<string, string> = { berlaku: "Berlaku", menunggu: "Menunggu konfirmasi", ditolak: "Ditolak" };

function Data({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

/**
 * Detail prodi di Dashboard akreditasi (desain form 2 D5, disepakati dengan Adrianne): ringkasan hanya baca satu prodi
 * lintas modul (akreditasi, LED, LKPS, review LPMPP, akun Tim Prodi) dan pintu masuk ke LED atau data LKPS-nya. Mengubah
 * data prodi tetap di Program studi (/pengaturan/prodi/[id]).
 */
export default async function HalamanDetailProdi({ params }: PageProps<"/dashboard/prodi/[id]">) {
  const p = await wajibAdmin();
  const { id } = await params;
  const [b] = await dataDashboard(p, new Date(), { prodiId: id });
  if (!b) notFound();
  const [riwayat, kesiapan] = await Promise.all([
    riwayatAkreditasiProdi(p, id),
    b.led ? kesiapanSemua(p, [b.led.id]) : Promise.resolve(new Map()),
  ]);
  const k = b.led ? kesiapan.get(b.led.id) : undefined;
  const akun = LABEL_STATUS_AKUN[b.statusAkun];

  return (
    <>
      <JudulHalaman
        judul={`${b.prodi.namaJenjang} ${b.prodi.nama}`}
        deskripsi={b.prodi.kodePddikti ? `Kode PDDikti ${b.prodi.kodePddikti}` : "Kode PDDikti belum diisi"}
        remah={[{ label: "Dashboard akreditasi", href: "/dashboard" }, { label: "Detail prodi" }]}
        aksi={(
          <div className="flex flex-wrap gap-2">
            {b.bolehCatat && b.led && (
              <Button asChild><Link href={`/pengaturan/prodi/${b.prodi.id}/akreditasi?led=${b.led.id}`}><Award aria-hidden />Catat hasil</Link></Button>
            )}
            <Button asChild variant="outline"><Link href={`/pengaturan/prodi/${b.prodi.id}`}><Pencil aria-hidden />Ubah data prodi</Link></Button>
          </div>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" aria-hidden />Akreditasi</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Data label="Lembaga">{b.lembaga}</Data>
            <Data label="Peringkat">
              {b.peringkat ? <Badge variant={/unggul/i.test(b.peringkat) ? "default" : "secondary"}>{b.peringkat}</Badge> : "—"}
            </Data>
            <Data label="Nomor SK">{b.nomorSk ?? "—"}</Data>
            <Data label="Masa berlaku">
              <span className={cn("tabular-nums", WARNA_MASA[b.masa.label])}>{b.berlakuSampai ? fmtTanggal.format(b.berlakuSampai) : "Belum diisi"}</span>
              <span className="block text-xs font-normal text-muted-foreground">{b.masa.teks}</span>
            </Data>
          </dl>
          {b.perluLedBaru && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Akreditasi segera berakhir dan prodi belum punya LED periode berikutnya.
              {b.akun.length > 0 && <TombolIngatkan prodiId={b.prodi.id} />}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" aria-hidden />LED · Laporan Evaluasi Diri</CardTitle>
            <CardDescription>{b.led ? `${b.led.nama} · diajukan ${b.led.tahunPengajuan}` : "Belum ada LED aktif."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {b.ledPersen !== null && <Kelengkapan persen={b.ledPersen} label="Kelengkapan LED" />}
            {k && <RingkasKesiapan k={k} />}
            {b.led && (
              <Button asChild variant="outline" className="w-fit"><Link href={`/led/asesor/${b.led.id}`}><BookOpen aria-hidden />Buka LED (hanya baca)</Link></Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-primary" aria-hidden />LKPS · Laporan Kinerja Prodi</CardTitle>
            <CardDescription>
              {b.lkpsPersen === null ? (b.led ? "Berkas LKPS belum diunggah ke LED aktif." : "Belum ada LED aktif untuk menerima LKPS.") : "Kelengkapan tabel LKPS untuk jenjang prodi."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {b.lkpsPersen !== null && <Kelengkapan persen={b.lkpsPersen} label="Kelengkapan LKPS" />}
            {b.led && (
              <Button asChild variant="outline" className="w-fit"><Link href={`/led/asesor/${b.led.id}/penilaian`}><FileSpreadsheet aria-hidden />Buka data LKPS</Link></Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" aria-hidden />Review LPMPP</CardTitle>
            <CardDescription>Review internal sebelum diajukan ke LAM Teknik.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Data label="Status"><Badge variant="outline" className={cn("whitespace-normal", NADA_STATUS[b.status])}>{LABEL_STATUS_LPMPP[b.status]}</Badge></Data>
              <Data label="Reviewer LPMPP">{b.led?.asesor ?? (b.led ? "Belum ditugaskan" : "—")}</Data>
              <Data label="Catatan reviewer terbuka">{b.led ? b.catatanTerbuka : "—"}</Data>
              <Data label="Simulasi skor">
                {b.simulasi ? `${formatAngka(b.simulasi.total)}${b.simulasi.perkiraan ? ` · proyeksi ${b.simulasi.perkiraan}` : ""}` : "Belum dinilai"}
              </Data>
            </dl>
            {b.led && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline"><Link href={`/led/asesor/${b.led.id}/penilaian`}><ClipboardCheck aria-hidden />Lihat penilaian</Link></Button>
                {!b.led.asesor && <Button asChild variant="outline"><Link href="/admin/penugasan">Tugaskan reviewer</Link></Button>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-4 text-primary" aria-hidden />Tim Prodi</CardTitle>
            <CardDescription>{akun ?? `${b.akun.length} akun aktif`}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {b.akun.map((a) => (
              <div key={a.id} className="flex flex-wrap justify-between gap-2">
                <span>{a.nama}</span>
                <span className="text-xs text-muted-foreground">{a.loginTerakhir ? `login ${fmtLogin.format(a.loginTerakhir)}` : "belum pernah login"}</span>
              </div>
            ))}
            <div className="mt-2 flex flex-wrap gap-3">
              <Link className="text-primary hover:underline" href={`/admin/akun/tambah?prodi=${b.prodi.id}`}>Tambah akun</Link>
              {b.akun.length > 0 && <Link className="text-primary hover:underline" href={`/admin/akun?prodi=${b.prodi.id}`}>Kelola akun</Link>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="size-4 text-primary" aria-hidden />Riwayat akreditasi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y px-0">
          {riwayat.length === 0 && <p className="px-6 text-sm text-muted-foreground">Belum ada riwayat akreditasi.</p>}
          {riwayat.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
              <span>
                <span className="font-medium">{r.peringkat}</span> · {r.lembaga}{r.nomorSk ? ` · SK ${r.nomorSk}` : ""}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.berlakuSampai ? `s.d. ${fmtTanggal.format(r.berlakuSampai)}` : "tanggal berakhir kosong"}
                <Badge variant="outline">{LABEL_RIWAYAT[r.status] ?? r.status}</Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
