import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Pengguna } from "@/lib/akses";
import { ambilFakultas } from "@/lib/data/organisasi";
import { bagianProyek, daftarProyek } from "@/lib/data/proyek";
import type { GrupNav, StatusLencana } from "./nav-sidebar";
import { ShellAplikasi } from "./shell-aplikasi";
import { PemilihLed } from "./pemilih-led";

/**
 * Menu Utama PJ (revisi 26 Okt 2026; sebelumnya "Pengaturan fakultas"): halaman awal setelah login, berisi daftar LED
 * dan data bersama yang dipakai semua LED.
 */
export const MENU_UTAMA: GrupNav = {
  label: "Menu utama",
  item: [
    { judul: "Semua LED", href: "/proyek", ikon: "proyek", persis: true },
    { judul: "Program studi", href: "/proyek/prodi", ikon: "prodi" },
    { judul: "Instrumen", href: "/proyek/instrumen", ikon: "instrumen" },
    { judul: "Basis Pengetahuan fakultas", href: "/proyek/dokumen-bersama", ikon: "dokumen" },
    { judul: "Kunci API fakultas", href: "/proyek/kunci-api", ikon: "kunci" },
  ],
};

const NAMA_PENDEK: Record<string, string> = {
  AWAL: "Halaman awal",
  I: "Bab I Pendahuluan",
  "II.A": "Bab II.A Tim penyusun",
  "II.B": "Bab II.B Lingkungan eksternal",
  III: "Bab III Pengembangan",
  IV: "Bab IV Penutup",
  LAMPIRAN: "Lampiran",
};

/**
 * Sidebar PJ dengan dua keadaan (revisi 26 Okt 2026):
 * - di luar LED: hanya Menu Utama (tidak perlu menggulir mencari menu);
 * - di dalam LED: tombol "Kembali ke Menu Utama", pemilih LED, lalu menu LED itu saja.
 */
export async function ShellPj({ pengguna, proyekId, children }: { pengguna: Pengguna; proyekId?: string; children: ReactNode }) {
  const [fakultas, data] = await Promise.all([
    ambilFakultas(),
    proyekId ? bagianProyek(pengguna, proyekId).catch(() => null) : Promise.resolve(null),
  ]);
  const subjudul = fakultas?.nama ?? "Fakultas belum diisi";

  if (!data) {
    return (
      <ShellAplikasi pengguna={pengguna} grup={[MENU_UTAMA]} subjudul={subjudul} beranda="/proyek">
        {children}
      </ShellAplikasi>
    );
  }

  const dasar = `/proyek/${data.proyek.id}`;
  const kriteria = data.bagian.filter((b) => b.jenis === "kriteria");
  const lain = data.bagian.filter((b) => b.jenis !== "kriteria");
  const grup: GrupNav[] = [
    {
      label: "LED ini",
      item: [
        { judul: "Beranda LED", href: dasar, ikon: "beranda", persis: true },
        { judul: "Data LKPS", href: `${dasar}/lkps`, ikon: "lkps" },
        { judul: "Basis Pengetahuan", href: `${dasar}/dokumen`, ikon: "dokumen" },
        { judul: "Tim penyusun", href: `${dasar}/tim`, ikon: "tim" },
        { judul: "Ekspor Word", href: `${dasar}/ekspor`, ikon: "ekspor" },
      ],
    },
    {
      label: "Kriteria",
      item: kriteria.map((b) => ({
        judul: b.nama, kode: b.kode, href: `${dasar}/bagian/${b.kode}`, ikon: "kriteria" as const, status: b.status as StatusLencana,
      })),
    },
    {
      label: "Bagian lain",
      item: lain.map((b) => ({
        judul: NAMA_PENDEK[b.kode] ?? b.nama, href: `${dasar}/bagian/${b.kode}`, ikon: "bab" as const, status: b.status as StatusLencana,
      })),
    },
  ];
  const pilihan = (await daftarProyek(pengguna))
    .filter((l) => !l.diarsipkanPada || l.id === data.proyek.id)
    .map((l) => ({ id: l.id, nama: l.nama, prodi: l.prodi.nama, arsip: Boolean(l.diarsipkanPada) }));
  return (
    <ShellAplikasi
      pengguna={pengguna}
      grup={grup}
      subjudul={subjudul}
      beranda={dasar}
      atasMenu={
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
          <Link href="/proyek" className="flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-primary">
            <ArrowLeft className="size-3.5" aria-hidden />Menu Utama
          </Link>
          <PemilihLed aktif={{ id: data.proyek.id, nama: data.proyek.nama, prodi: data.proyek.prodi.nama }} pilihan={pilihan} />
        </div>
      }
    >
      {children}
    </ShellAplikasi>
  );
}

/** Halaman Menu Utama PJ (Semua LED, Program studi, Instrumen, Basis Pengetahuan fakultas, Kunci API). */
export async function ShellDaftarProyek({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  return <ShellPj pengguna={pengguna}>{children}</ShellPj>;
}
