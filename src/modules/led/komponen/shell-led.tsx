import type { ReactNode } from "react";
import type { Pengguna } from "@/modules/bersama/akses";
import { ambilFakultas, ambilProdi } from "@/modules/bersama/data/organisasi";
import { bagianProyek, daftarProyek } from "@/modules/led/data/proyek";
import type { GrupNav, StatusLencana } from "@/components/shell/nav-sidebar";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { MENU_ADMIN, MENU_TIM_PRODI } from "@/components/shell/menu-peran";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { PemilihLed } from "./pemilih-led";


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
 * Sidebar LED dengan dua keadaan (revisi 26 Okt 2026):
 * - di luar LED: Menu LED Tim Prodi, atau menu Admin UPPS (Pantau LED, Instrumen, Basis Pengetahuan fakultas);
 * - di dalam LED (Tim Prodi): pemilih LED, menu "Kembali ke Menu LED", lalu menu LED itu saja.
 */
export async function ShellLed({ pengguna, proyekId, children }: { pengguna: Pengguna; proyekId?: string; children: ReactNode }) {
  const [fakultas, data] = await Promise.all([
    ambilFakultas(),
    proyekId ? bagianProyek(pengguna, proyekId).catch(() => null) : Promise.resolve(null),
  ]);
  const subjudul = fakultas?.nama ?? "Fakultas belum diisi";

  if (pengguna.peran === "ADMIN") {
    return (
      <ShellAplikasi pengguna={pengguna} grup={MENU_ADMIN} subjudul={`Admin UPPS · ${subjudul}`} beranda="/led/pantau">
        {children}
      </ShellAplikasi>
    );
  }
  if (!data) {
    const prodi = pengguna.prodiId ? await ambilProdi(pengguna, pengguna.prodiId) : null;
    return (
      <ShellAplikasi pengguna={pengguna} grup={[MENU_TIM_PRODI]} subjudul={prodi ? `${namaJenjang(prodi.jenjang)} ${prodi.nama}` : subjudul} beranda="/led">
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
        { judul: "Perkiraan nilai", href: `${dasar}/penilaian`, ikon: "penilaian" },
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
      atasMenu={<PemilihLed aktif={{ id: data.proyek.id, nama: data.proyek.nama, prodi: data.proyek.prodi.nama }} pilihan={pilihan} />}
    >
      {children}
    </ShellAplikasi>
  );
}

/** Halaman di luar satu LED: LED prodi (Tim Prodi) atau Pantau LED, Instrumen, Basis Pengetahuan fakultas (Admin UPPS). */
export async function ShellMenuLed({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  return <ShellLed pengguna={pengguna}>{children}</ShellLed>;
}
