import { notFound } from "next/navigation";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import type { GrupNav } from "@/components/shell/nav-sidebar";
import { GalatAkses } from "@/modules/bersama/akses";
import { bagianProyek } from "@/modules/led/data/proyek";
import { wajibPeran } from "@/modules/bersama/sesi";
import { menuPeran } from "@/components/shell/menu-peran";

/**
 * Satu LED yang ditugaskan (revisi 22 Okt 2026): hanya baca, catatan revisi, dan penilaian akhir. Revisi 31 Okt 2026:
 * tampilan yang sama dipakai Admin UPPS untuk membaca LED mana pun (dari Pantau LED), tanpa alat catatan dan skor.
 */
export default async function LayoutLedAsesor({ children, params }: LayoutProps<"/led/asesor/[proyekId]">) {
  const p = await wajibPeran("ASESOR", "ADMIN");
  const admin = p.peran === "ADMIN";
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
    ...menuPeran(p.peran, "led"),
    {
      label: admin ? "LED ini (hanya baca)" : "LED ini",
      item: [
        // revisi 31 Okt 2026 (Pak Tris): Penilaian di depan
        { judul: "Penilaian", href: `${dasar}/penilaian`, ikon: "penilaian" },
        { judul: admin ? "Ringkasan" : "Ringkasan review", href: dasar, ikon: "beranda", persis: true },
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
    <ShellAplikasi pengguna={p} grup={grup} subjudul={data.proyek.prodi.nama} beranda={dasar}>
      {children}
    </ShellAplikasi>
  );
}
