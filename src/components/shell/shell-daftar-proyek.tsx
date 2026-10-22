import type { ReactNode } from "react";
import { cookies } from "next/headers";
import type { Pengguna } from "@/lib/akses";
import { ambilFakultas } from "@/lib/data/organisasi";
import { bagianProyek, daftarProyek } from "@/lib/data/proyek";
import type { GrupNav, StatusLencana } from "./nav-sidebar";
import { ShellAplikasi } from "./shell-aplikasi";
import { KUKI_LED } from "@/lib/kuki";
import { IngatLed, PemilihLed } from "./pemilih-led";

/** Menu fakultas PJ (revisi 19 Okt 2026); revisi 23 Okt 2026: selalu tampil di bawah menu LED yang sedang dibuka. */
export const MENU_FAKULTAS: GrupNav = {
  label: "Pengaturan fakultas",
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
 * Satu sidebar untuk semua halaman PJ (revisi 23 Okt 2026). Menu LED yang sedang dibuka selalu ada di atas, juga saat
 * PJ membuka menu fakultas (LED terakhir diingat di kuki), sehingga salah klik tidak membuat PJ "tersesat": cukup klik
 * menu LED lagi. Pemilih LED di atas sidebar untuk berpindah LED.
 */
export async function ShellPj({ pengguna, proyekId, children }: { pengguna: Pengguna; proyekId?: string; children: ReactNode }) {
  const [semua, fakultas] = await Promise.all([daftarProyek(pengguna), ambilFakultas()]);
  // LED dari halaman, atau LED terakhir dibuka (kuki), atau LED aktif pertama (akreditasi paling dekat berakhir)
  const idAktif = proyekId ?? (await cookies()).get(KUKI_LED)?.value ?? semua.find((l) => !l.diarsipkanPada)?.id;
  const data = idAktif ? await bagianProyek(pengguna, idAktif).catch(() => null) : null;
  const grup: GrupNav[] = [];
  if (data) {
    const dasar = `/proyek/${data.proyek.id}`;
    const kriteria = data.bagian.filter((b) => b.jenis === "kriteria");
    const lain = data.bagian.filter((b) => b.jenis !== "kriteria");
    grup.push(
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
    );
  }
  grup.push(MENU_FAKULTAS);
  const pilihan = semua
    .filter((l) => !l.diarsipkanPada || l.id === data?.proyek.id)
    .map((l) => ({ id: l.id, nama: l.nama, prodi: l.prodi.nama, arsip: Boolean(l.diarsipkanPada) }));
  return (
    <ShellAplikasi
      pengguna={pengguna}
      grup={grup}
      subjudul={fakultas?.nama ?? "Fakultas belum diisi"}
      beranda={data ? `/proyek/${data.proyek.id}` : "/proyek"}
      atasMenu={<PemilihLed aktif={data ? { id: data.proyek.id, nama: data.proyek.nama, prodi: data.proyek.prodi.nama } : null} pilihan={pilihan} />}
    >
      {proyekId && data && <IngatLed id={proyekId} />}
      {children}
    </ShellAplikasi>
  );
}

/** Halaman PJ di luar satu LED (Semua LED, Program studi, Instrumen, Basis Pengetahuan fakultas, Kunci API). */
export async function ShellDaftarProyek({ pengguna, children }: { pengguna: Pengguna; children: ReactNode }) {
  return <ShellPj pengguna={pengguna}>{children}</ShellPj>;
}
