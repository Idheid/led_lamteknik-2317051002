import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { wajibPeran } from "@/modules/bersama/sesi";
import { daftarProyek } from "@/modules/led/data/proyek";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import { prodiAktifHalaman } from "@/modules/lkps/komponen/prodi-halaman";
import { BerandaLkps } from "@/modules/lkps/komponen/beranda/beranda-lkps";
import { kriteriaTambahanAktif, progresLkps } from "@/modules/lkps/data/beranda";
import { pilihanProdiLkps } from "@/modules/lkps/data/prodi-aktif";

export const metadata: Metadata = { title: "Beranda LKPS" };

/** Alamat LED aktif prodi untuk keterangan beranda: Data LKPS LED (Tim Prodi), Penilaian (Admin), daftar LED (reviewer). */
async function alamatLed(p: Awaited<ReturnType<typeof wajibPeran>>, prodiId: string): Promise<{ href: string; label: string } | null> {
  if (p.peran === "ASESOR") return { href: "/led/asesor", label: "Buka LED yang ditugaskan" };
  const aktif = (await daftarProyek(p)).find((x) => x.prodiId === prodiId && !x.diarsipkanPada);
  if (!aktif) return null;
  return p.peran === "TIM_PRODI"
    ? { href: `/led/${aktif.id}/lkps`, label: `Buka Data LKPS ${aktif.nama}` }
    : { href: `/led/asesor/${aktif.id}/penilaian`, label: `Lihat ${aktif.nama}` };
}

/**
 * Beranda modul LKPS (Gabung LKPS G5, RENCANA-GABUNG-LKPS G5 butir 6): progres pengisian per kriteria (dashboard kode
 * asal Ghalib) dan keterangan bahwa LED masih membaca LKPS dari berkas yang diunggah.
 */
export default async function HalamanLkps() {
  const p = await wajibPeran("ADMIN", "TIM_PRODI", "ASESOR");
  const prodiId = await prodiAktifHalaman(p);
  const judul = <JudulHalaman judul="Beranda LKPS" deskripsi="Laporan Kinerja Program Studi: isian tabel kriteria 1–9, impor One Data, dan ekspor Excel." />;
  if (!prodiId) return <WajibProdi judul="Beranda LKPS">{null}</WajibProdi>;

  const [progres, tambahan, daftar, led] = await Promise.all([
    progresLkps(p, prodiId), kriteriaTambahanAktif(p), pilihanProdiLkps(p), alamatLed(p, prodiId),
  ]);
  return (
    <>
      {judul}
      <Alert>
        <Info aria-hidden />
        <AlertTitle>Keterangan</AlertTitle>
        <AlertDescription>
          <p>Data di modul LKPS belum dipakai LED. LED membaca LKPS dari berkas Excel/PDF yang diunggah di Data LKPS proyek LED.</p>
          {led && <Link href={led.href} className="font-medium text-primary underline-offset-4 hover:underline">{led.label} →</Link>}
        </AlertDescription>
      </Alert>
      <BerandaLkps nama={p.nama} namaProdi={daftar.find((d) => d.id === prodiId)?.label ?? ""} peran={p.peran} progres={progres} tambahan={tambahan} />
    </>
  );
}
