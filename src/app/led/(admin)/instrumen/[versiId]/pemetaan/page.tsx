import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { GalatPengguna } from "@/modules/bersama/akses";
import { dataPemetaan } from "@/modules/led/data/unggah-instrumen";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormPemetaan } from "./form-pemetaan";

export const metadata: Metadata = { title: "Pemetaan judul template" };

/**
 * Pemetaan judul oleh Admin UPPS (perbaikan 2 Nov 2026, I3), tanpa AI dan tanpa token: peran setiap gaya paragraf
 * Template LED yang formatnya tidak dikenali aturan bawaan, dengan pratinjau struktur langsung.
 */
export default async function HalamanPemetaan({ params }: PageProps<"/led/instrumen/[versiId]/pemetaan">) {
  const p = await wajibAdmin();
  const { versiId } = await params;
  const data = await dataPemetaan(p, versiId).catch((e) => {
    if (e instanceof GalatPengguna) return null;
    throw e;
  });
  if (!data) notFound();
  const { versi } = data;
  const terkunci = versi.status === "aktif" || versi._count.proyek > 0;
  return (
    <>
      <JudulHalaman
        judul="Pemetaan judul template"
        deskripsi={<span>{versi.templateLedNama} · <span className="font-mono">{versi.kode}</span></span>}
        remah={[{ label: "Instrumen", href: "/led/instrumen" }, { label: versi.kode, href: `/led/instrumen/${versi.id}` }, { label: "Pemetaan judul" }]}
      />
      <Petunjuk
        kunci="admin-pemetaan"
        fungsi="Untuk Template LED yang format judulnya berbeda dari template yang dikenal sistem. Tanpa AI, tanpa token."
        langkah={[
          "Untuk setiap gaya paragraf, pilih perannya: BAB, bagian Bab II, kriteria, judul sub-bagian, instruksi, atau abaikan. Usulan awal sudah diisi.",
          "Lihat pratinjau di samping: jumlah kriteria harus sama dengan Matriks Penilaian, dan jenjang instrumen ini harus punya sub-bagian.",
          "Simpan pemetaan, kembali ke halaman versi, lalu Mulai ekstraksi dan periksa hasilnya di halaman Cek.",
        ]}
      />
      <FormPemetaan
        versiId={versi.id}
        jenjang={versi.jenjangUtama}
        terkunci={terkunci}
        paragraf={data.paragraf}
        gaya={data.gaya}
        usulan={data.usulan}
        tersimpan={data.pemetaan}
        kriteriaMatriks={data.kriteriaMatriks}
      />
    </>
  );
}
