import { notFound } from "next/navigation";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import type { GrupNav, StatusLencana } from "@/components/shell/nav-sidebar";
import { GalatAkses } from "@/lib/akses";
import { bagianProyek } from "@/lib/data/proyek";
import { tugasProyek } from "@/lib/data/generate";
import { BannerAntrean } from "@/components/narasi/banner-antrean";
import { wajibPenanggungJawab } from "@/lib/sesi";

const NAMA_PENDEK: Record<string, string> = {
  AWAL: "Halaman awal",
  I: "Bab I Pendahuluan",
  "II.A": "Bab II.A Tim penyusun",
  "II.B": "Bab II.B Lingkungan eksternal",
  III: "Bab III Pengembangan",
  IV: "Bab IV Penutup",
  LAMPIRAN: "Lampiran",
};

export default async function LayoutProyekLED({ children, params }: LayoutProps<"/proyek/[proyekId]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  let data;
  try {
    data = await bagianProyek(p, proyekId);
  } catch (e) {
    if (e instanceof GalatAkses) notFound();
    throw e;
  }
  const { proyek, bagian } = data;
  const tugas = await tugasProyek(p, proyekId);
  const dasar = `/proyek/${proyekId}`;
  const kriteria = bagian.filter((b) => b.jenis === "kriteria");
  const lain = bagian.filter((b) => b.jenis !== "kriteria");
  const grup: GrupNav[] = [
    {
      label: "Proyek",
      item: [
        { judul: "Beranda", href: dasar, ikon: "beranda", persis: true },
        { judul: "Data LKPS", href: `${dasar}/lkps`, ikon: "lkps" },
        { judul: "Dokumen", href: `${dasar}/dokumen`, ikon: "dokumen" },
        { judul: "Kunci API", href: `${dasar}/kunci-api`, ikon: "kunci" },
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
    {
      label: "Iterasi berikutnya",
      item: [
        { judul: "Ekspor Word", href: `${dasar}/ekspor`, ikon: "ekspor", segera: true },
      ],
    },
  ];
  return (
    <ShellAplikasi pengguna={p} grup={grup} subjudul={proyek.prodi.nama} beranda={dasar}>
      <BannerAntrean proyekId={proyekId} awal={tugas} />
      {children}
    </ShellAplikasi>
  );
}
