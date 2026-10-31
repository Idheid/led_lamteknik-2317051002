import { notFound } from "next/navigation";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import type { GrupNav } from "@/components/shell/nav-sidebar";
import { GalatAkses } from "@/modules/bersama/akses";
import { bagianProyek } from "@/modules/led/data/proyek";
import { wajibAsesor } from "@/modules/bersama/sesi";
import { MENU_ASESOR } from "../menu";

/** Satu LED yang ditugaskan (revisi 22 Okt 2026): hanya baca, catatan revisi, dan penilaian akhir. */
export default async function LayoutLedAsesor({ children, params }: LayoutProps<"/led/asesor/[proyekId]">) {
  const p = await wajibAsesor();
  const { proyekId } = await params;
  let data;
  try {
    data = await bagianProyek(p, proyekId);
  } catch (e) {
    if (e instanceof GalatAkses) notFound();
    throw e;
  }
  const dasar = `/led/asesor/${proyekId}`;
  const isi = data.bagian.filter((b) => b.jenis === "kriteria" || b.jenis === "bab" || b.jenis === "butir");
  const grup: GrupNav[] = [
    MENU_ASESOR,
    {
      label: "LED ini",
      item: [
        { judul: "Ringkasan review", href: dasar, ikon: "beranda", persis: true },
        { judul: "Penilaian akhir", href: `${dasar}/penilaian`, ikon: "penilaian" },
      ],
    },
    {
      label: "Narasi",
      item: isi.map((b) => ({
        judul: b.nama, kode: b.jenis === "kriteria" ? b.kode : undefined, href: `${dasar}/bagian/${b.kode}`, ikon: b.jenis === "kriteria" ? "kriteria" as const : "bab" as const,
      })),
    },
  ];
  return (
    <ShellAplikasi pengguna={p} grup={grup} judul="LED LAM Teknik" subjudul={data.proyek.prodi.nama} beranda={dasar}>
      {children}
    </ShellAplikasi>
  );
}
