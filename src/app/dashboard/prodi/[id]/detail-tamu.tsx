import { notFound } from "next/navigation";
import { Award, BookOpen, ClipboardCheck, FileSpreadsheet, History } from "lucide-react";
import type { Pengguna } from "@/modules/bersama/akses";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { dataDashboardTamu, riwayatAkreditasiTamu } from "@/modules/led/data/dashboard";
import { LABEL_STATUS_LPMPP } from "@/modules/led/domain/dashboard";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/modules/bersama/utils";
import { fmtTanggal, Kelengkapan, NADA_STATUS, WARNA_MASA } from "../../tampil";

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
 * Gabung LKPS G2 (= Rencana 18 Nov S2 poin 5, keputusan Adrianne 18 Nov): detail prodi untuk Tamu, hanya baca. Data dari
 * dataDashboardTamu (tanpa akun Tim Prodi, reviewer, catatan, dan tombol ke halaman admin atau LED).
 */
export async function DetailProdiTamu({ p, prodiId }: { p: Pengguna; prodiId: string }) {
  const [[b], riwayat] = await Promise.all([dataDashboardTamu(p, new Date(), { prodiId }), riwayatAkreditasiTamu(p, prodiId)]);
  if (!b) notFound();
  return (
    <>
      <JudulHalaman
        judul={`${b.prodi.namaJenjang} ${b.prodi.nama}`}
        deskripsi={b.prodi.kodePddikti ? `Kode PDDikti ${b.prodi.kodePddikti}` : "Kode PDDikti belum diisi"}
        remah={[{ label: "Dashboard akreditasi", href: "/dashboard" }, { label: "Detail prodi" }]}
      />
      <Alert>
        <AlertDescription>Anda masuk sebagai Tamu (hanya baca). Untuk menyusun LKPS/LED atau mereview, minta Admin UPPS memberi peran.</AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="size-4 text-primary" aria-hidden />Akreditasi</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Data label="Lembaga">{b.lembaga}</Data>
              <Data label="Peringkat">
                {b.peringkat ? <Badge variant={/unggul/i.test(b.peringkat) ? "default" : "secondary"}>{b.peringkat}</Badge> : "—"}
              </Data>
              <Data label="Nomor SK">{b.nomorSk ?? "—"}</Data>
              <Data label="Berlaku sampai">
                <span className={cn("tabular-nums", WARNA_MASA[b.masa.label])}>{b.berlakuSampai ? fmtTanggal.format(b.berlakuSampai) : "Belum diisi"}</span>
                <span className="block text-xs font-normal text-muted-foreground">{b.masa.teks}</span>
              </Data>
            </dl>
            {b.perluLedBaru && <Badge variant="outline" className="mt-4 border-amber-400 text-amber-800 dark:text-amber-200">Perlu LED baru</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" aria-hidden />LED</CardTitle>
            <CardDescription>{b.led ? `${b.led.nama} · diajukan ${b.led.tahunPengajuan}` : "Belum ada LED aktif."}</CardDescription>
          </CardHeader>
          <CardContent>{b.ledPersen !== null ? <Kelengkapan persen={b.ledPersen} label="Kelengkapan LED" /> : <span className="text-sm text-muted-foreground">—</span>}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-primary" aria-hidden />LKPS</CardTitle>
          </CardHeader>
          <CardContent>{b.lkpsPersen !== null ? <Kelengkapan persen={b.lkpsPersen} label="Kelengkapan LKPS" /> : <span className="text-sm text-muted-foreground">Belum ada data.</span>}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" aria-hidden />Review LPMPP</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Data label="Status"><Badge variant="outline" className={cn("whitespace-normal", NADA_STATUS[b.status])}>{LABEL_STATUS_LPMPP[b.status]}</Badge></Data>
              <Data label="Simulasi nilai">
                {b.simulasi ? `${formatAngka(b.simulasi.total)}${b.simulasi.perkiraan ? ` · proyeksi ${b.simulasi.perkiraan}` : ""}` : "Belum dinilai"}
              </Data>
            </dl>
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
              <span><span className="font-medium">{r.peringkat}</span> · {r.lembaga}{r.nomorSk ? ` · SK ${r.nomorSk}` : ""}</span>
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
