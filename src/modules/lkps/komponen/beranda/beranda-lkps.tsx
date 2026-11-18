import Link from "next/link";
import { CheckCircle2, Clock, Layers, PencilLine } from "lucide-react";
import type { Peran } from "@/modules/bersama/peran";
import type { KriteriaTambahan } from "@/modules/lkps/data/beranda";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CincinProgres, IkonKriteria } from "@/modules/lkps/komponen/bersama/kriteria-tampil";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/dashboard/page.tsx.
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Card, Progress, Badge, Button, Petunjuk). Dipertahankan dari kode
// asal: progres per kriteria (rumus di data/beranda.ts), cincin progres, ikon berwarna per kriteria, ringkasan jumlah
// kriteria selesai/diisi/belum, dan tautan Kelola kriteria & tabel. Kotak "Petunjuk Pengisian" menjadi Petunjuk LED.

const KRITERIA_BAKU = [
  { id: 1, href: "/lkps/kerjasama", nama: "Tata Pamong, Tata Kelola & Kerjasama", desc: "Data kerjasama institusional (N1/N2/N3)" },
  { id: 2, href: "/lkps/mahasiswa", nama: "Mahasiswa", desc: "Seleksi mahasiswa baru TS s/d TS-4" },
  { id: 3, href: "/lkps/sdm", nama: "Sumber Daya Manusia", desc: "Profil DTPS, EWMP, luaran dosen" },
  { id: 4, href: "/lkps/keuangan", nama: "Keuangan, Sarana & Prasarana", desc: "Penggunaan dana & data laboratorium" },
  { id: 5, href: "/lkps/pendidikan", nama: "Pendidikan", desc: "Kurikulum, RPS, dan program MBKM" },
  { id: 6, href: "/lkps/penelitian", nama: "Penelitian", desc: "Pelibatan mahasiswa dalam penelitian dosen" },
  { id: 7, href: "/lkps/pkm", nama: "Pengabdian kepada Masyarakat", desc: "Pelibatan mahasiswa dalam PkM dosen" },
  { id: 8, href: "/lkps/luaran", nama: "Luaran dan Capaian Tridharma", desc: "IPK, prestasi, tracer study, luaran mahasiswa" },
  { id: 9, href: "/lkps/penjaminan", nama: "Sistem Penjaminan Mutu Internal", desc: "Dokumen SPMI, AMI, dan siklus PPEPP" },
];

function KotakAngka({ label, nilai, ikon: Ikon, nada }: { label: string; nilai: number; ikon: typeof Layers; nada: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className={`inline-flex size-9 items-center justify-center rounded-lg ${nada}`} aria-hidden><Ikon className="size-4" /></span>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{nilai}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BerandaLkps({
  nama, namaProdi, peran, progres, tambahan,
}: { nama: string; namaProdi: string; peran: Peran; progres: Record<number, number>; tambahan: KriteriaTambahan[] }) {
  const daftar = [
    ...KRITERIA_BAKU.map((k) => ({ ...k, kode: `K${k.id}`, progres: progres[k.id] ?? 0, kustom: false })),
    ...tambahan.map((k) => ({
      id: k.nomorUrut,
      href: `/lkps/kriteria/${k.id}`,
      nama: k.nama,
      desc: k.deskripsi || `${k.jumlahTabel} tabel instrumen kriteria kustom`,
      kode: k.kode,
      progres: 0,
      kustom: true,
    })),
  ];
  const total = daftar.length;
  const keseluruhan = total ? Math.round(daftar.reduce((a, c) => a + c.progres, 0) / total) : 0;
  const selesai = daftar.filter((c) => c.progres >= 100).length;
  const diisi = daftar.filter((c) => c.progres > 0 && c.progres < 100).length;
  const belum = daftar.filter((c) => c.progres === 0).length;

  return (
    <>
      <Petunjuk
        kunci="lkps-beranda"
        fungsi={peran === "ASESOR"
          ? "Anda membaca LKPS program studi yang LED-nya ditugaskan kepada Anda. Semua isian terkunci (hanya baca)."
          : "Ringkasan pengisian LKPS program studi: progres setiap kriteria dihitung dari tabel yang sudah terisi."}
        langkah={[
          "Klik kartu kriteria untuk membuka dan mengisi tabelnya.",
          "Tim Prodi mengisi LKPS prodinya. Admin UPPS memantau semua prodi dan mengatur struktur kriteria & tabel. Reviewer LPMPP hanya membaca.",
          "Simulasi skor (RK, RMD, dan lainnya) dihitung otomatis dari isian.",
          "Setelah semua terisi, unduh berkas LKPS lewat Ekspor Excel.",
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Selamat datang, {nama}</CardTitle>
          <CardDescription>Data LKPS program studi <span className="font-medium text-foreground">{namaProdi}</span>.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Progres keseluruhan</span>
            <span className="text-2xl font-semibold tabular-nums text-primary">{keseluruhan}%</span>
          </div>
          <Progress value={keseluruhan} className="h-2" aria-label={`Progres keseluruhan ${keseluruhan}%`} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KotakAngka label="Total kriteria" nilai={total} ikon={Layers} nada="bg-primary/10 text-primary" />
        <KotakAngka label="Kriteria selesai" nilai={selesai} ikon={CheckCircle2} nada="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" />
        <KotakAngka label="Sedang diisi" nilai={diisi} ikon={PencilLine} nada="bg-amber-500/10 text-amber-700 dark:text-amber-300" />
        <KotakAngka label="Belum dimulai" nilai={belum} ikon={Clock} nada="bg-muted text-muted-foreground" />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="judul-kriteria-lkps">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="judul-kriteria-lkps" className="text-lg font-semibold">{total} kriteria akreditasi</h2>
            <p className="text-sm text-muted-foreground">Klik kartu kriteria untuk membuka tabelnya. Progres dihitung dari data yang sudah tersimpan.</p>
          </div>
          {peran === "ADMIN" && (
            <Button asChild variant="outline" size="sm"><Link href="/lkps/konfigurasi"><Layers aria-hidden />Kelola kriteria & tabel</Link></Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {daftar.map((c) => (
            <Link
              key={`${c.kode}-${c.href}`}
              href={c.href}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="h-full gap-3 py-4 transition-colors group-hover:border-primary/40 group-hover:bg-muted/30">
                <CardContent className="flex items-start gap-3 px-4">
                  <IkonKriteria nomor={c.kustom ? 0 : c.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      <span>{c.kode}: {c.nama}</span>
                      {c.kustom && <Badge variant="secondary">Kustom</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{c.desc}</p>
                    <Progress value={c.progres} className="mt-3 h-1.5" aria-hidden />
                  </div>
                  <CincinProgres persen={c.progres} label={`Progres ${c.kode} ${c.progres}%`} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
