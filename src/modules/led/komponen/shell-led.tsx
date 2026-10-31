import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { bagianProyek, daftarProyek } from "@/modules/led/data/proyek";
import type { GrupNav, StatusLencana } from "@/components/shell/nav-sidebar";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { MENU_DATA_BERSAMA } from "@/components/shell/menu-peran";
import { PemilihLed } from "./pemilih-led";

/**
 * Menu LED (31 Okt 2026; sebelumnya "Menu utama" PJ): daftar LED dan bahan yang dipakai semua LED. Program studi dan
 * kunci API dipakai juga oleh modul LKPS, jadi ada di grup "Data bersama LKPS & LED" (MENU_DATA_BERSAMA).
 */
export const MENU_LED: GrupNav = {
  label: "Menu LED",
  item: [
    { judul: "Semua LED", href: "/led", ikon: "proyek", persis: true },
    { judul: "Instrumen", href: "/led/instrumen", ikon: "instrumen" },
    { judul: "Basis Pengetahuan fakultas", href: "/led/dokumen-bersama", ikon: "dokumen" },
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
 * - di luar LED: Menu LED dan data bersama (tidak perlu menggulir mencari menu);
 * - di dalam LED: pemilih LED, menu "Kembali ke Menu LED", lalu menu LED itu saja.
 */
export async function ShellLed({ pengguna, proyekId, children }: { pengguna: Pengguna; proyekId?: string; children: ReactNode }) {
  const [fakultas, data] = await Promise.all([
    ambilFakultas(),
    proyekId ? bagianProyek(pengguna, proyekId).catch(() => null) : Promise.resolve(null),
  ]);
  const subjudul = fakultas?.nama ?? "Fakultas belum diisi";

  if (!data) {
    return (
      <ShellAplikasi pengguna={pengguna} grup={[MENU_LED, MENU_DATA_BERSAMA]} judul="LED LAM Teknik" subjudul={subjudul} beranda="/led">
        {children}
      </ShellAplikasi>
    );
  }

  const dasar = `/led/${data.proyek.id}`;
  const kriteria = data.bagian.filter((b) => b.jenis === "kriteria");
  const lain = data.bagian.filter((b) => b.jenis !== "kriteria");
  const grup: GrupNav[] = [
    // revisi 26 Okt 2026: kembali ke menu sebagai menu biasa di bawah kartu LED, di atas "LED ini"
    { label: "Kembali ke Menu LED", item: [{ judul: "Menu LED", href: "/led", ikon: "kembali", persis: true }] },
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
      judul="LED LAM Teknik"
      subjudul={subjudul}
      beranda={dasar}
      atasMenu={<PemilihLed aktif={{ id: data.proyek.id, nama: data.proyek.nama, prodi: data.proyek.prodi.nama }} pilihan={pilihan} />}
    >
      {children}
    </ShellAplikasi>
  );
}

/** Halaman Menu LED (Semua LED, Instrumen, Basis Pengetahuan fakultas) dengan menu data bersama. */
export async function ShellMenuLed({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  return <ShellLed pengguna={pengguna}>{children}</ShellLed>;
}
