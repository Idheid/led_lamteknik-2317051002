import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2, FileSpreadsheet, FileText, KeyRound, LayoutGrid, type LucideIcon } from "lucide-react";
import { wajibLogin } from "@/modules/bersama/sesi";
import { berandaPeran, LABEL_PERAN } from "@/modules/bersama/peran";
import { ambilFakultas, daftarProdi } from "@/modules/bersama/data/organisasi";
import { daftarProyek } from "@/modules/led/data/proyek";
import { ledAsesor } from "@/modules/led/data/review";
import { MODUL_LKPS } from "@/modules/lkps";
import { berandaLed } from "@/components/shell/menu-peran";
import { Lonceng } from "@/components/shell/lonceng";
import { MenuPengguna } from "@/components/shell/menu-pengguna";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Pilih modul" };

/**
 * Halaman awal setelah login (31 Okt 2026): satu website, dua modul. Pengguna memilih LKPS atau LED; di dalam modul,
 * tombol LKPS | LED di kepala halaman memindahkan modul tanpa kembali ke sini. Admin langsung ke menu admin.
 */
export default async function HalamanAwal() {
  const p = await wajibLogin();
  if (p.peran === "SUPER_ADMIN") redirect(berandaPeran(p.peran));

  const fakultas = await ambilFakultas();
  let infoLed: string;
  let prodi: number | null = null;
  if (p.peran === "ASESOR") {
    const led = await ledAsesor(p);
    infoLed = `${led.length} LED ditugaskan kepada Anda`;
  } else {
    const [proyek, daftar] = await Promise.all([daftarProyek(p), daftarProdi(p)]);
    infoLed = `${proyek.filter((x) => !x.diarsipkanPada).length} LED aktif`;
    prodi = daftar.length;
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">Akreditasi LAM Teknik</div>
            <div className="truncate text-xs text-muted-foreground">{fakultas?.nama ?? "Fakultas belum diisi"}</div>
          </div>
          <span className="ml-auto flex items-center gap-1">
            <Lonceng />
            <MenuPengguna nama={p.nama} email={p.email} peran={LABEL_PERAN[p.peran]} />
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Selamat datang, {p.nama}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Pilih modul</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Satu akun untuk LKPS dan LED. Di dalam modul, pindah ke modul lain lewat tombol LKPS | LED di bagian atas halaman.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <KartuModul
            href="/lkps"
            ikon={FileSpreadsheet}
            kode="LKPS"
            nama="Laporan Kinerja Program Studi"
            deskripsi="Isi tabel data kinerja prodi sesuai template LKPS LAM Teknik 2025, impor dan ekspor Excel, cetak PDF per tabel."
            info={MODUL_LKPS.siap ? null : <Badge variant="secondary">Sedang disiapkan</Badge>}
          />
          <KartuModul
            href={berandaLed(p.peran)}
            ikon={FileText}
            kode="LED"
            nama="Laporan Evaluasi Diri"
            deskripsi={p.peran === "ASESOR"
              ? "Review LED yang ditugaskan: beri catatan revisi pada teks, terima perbaikan, dan isi penilaian akhir."
              : "Susun narasi per kriteria dengan bantuan AI dari data LKPS dan Basis Pengetahuan, review asesor, lalu ekspor ke Word."}
            info={<Badge variant="outline">{infoLed}</Badge>}
          />
        </div>

        {p.peran === "PENANGGUNG_JAWAB" && (
          <section aria-labelledby="judul-bersama" className="flex flex-col gap-3">
            <div>
              <h2 id="judul-bersama" className="text-sm font-semibold">Data bersama LKPS & LED</h2>
              <p className="text-sm text-muted-foreground">Diisi sekali, dipakai kedua modul.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TautanBersama href="/pengaturan/prodi" ikon={Building2} judul="Program studi" keterangan={`${prodi ?? 0} program studi dan identitas fakultas`} />
              <TautanBersama href="/pengaturan/kunci-api" ikon={KeyRound} judul="Kunci API fakultas" keterangan="Kunci Gemini untuk fitur AI" />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function KartuModul({ href, ikon: Ikon, kode, nama, deskripsi, info }: {
  href: string; ikon: LucideIcon; kode: string; nama: string; deskripsi: string; info: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border bg-background p-6 shadow-xs transition hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Ikon className="size-6" aria-hidden />
        </div>
        {info}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight">{kode}</div>
        <div className="font-medium">{nama}</div>
        <p className="text-sm text-muted-foreground">{deskripsi}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
        Buka {kode}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

function TautanBersama({ href, ikon: Ikon, judul, keterangan }: { href: string; ikon: LucideIcon; judul: string; keterangan: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Ikon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{judul}</span>
        <span className="block truncate text-xs text-muted-foreground">{keterangan}</span>
      </span>
    </Link>
  );
}
