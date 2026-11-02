import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { GalatPengguna } from "@/modules/bersama/akses";
import { bacaUsulanStruktur, dataPemetaan, perkiraanUsulanAi } from "@/modules/led/data/unggah-instrumen";
import { PemantauProses } from "@/components/status-proses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { Sparkles } from "lucide-react";
import { TombolUsulanAi } from "./tombol-usulan-ai";
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
  // I4: usulan AI hanya atas permintaan Admin; hasilnya mengisi usulan di tabel, tidak disimpan sendiri
  const ai = bacaUsulanStruktur(versi.usulanStruktur);
  const berjalan = ai?.status === "antre" || ai?.status === "berjalan";
  const perkiraan = terkunci ? null : await perkiraanUsulanAi(p, versi.id);
  const aiSelesai = ai?.status === "selesai" ? { gaya: ai.gaya ?? {}, alasan: ai.alasan ?? {} } : null;
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
      <PemantauProses aktif={berjalan} detik={3} />
      <Alert>
        <Sparkles aria-hidden />
        <AlertTitle>Usulan AI (opsional)</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>
            Bila usulan awal belum tepat, minta AI mengusulkan peran setiap gaya. Hanya berjalan bila Anda mengkliknya; pemetaan manual di bawah
            tidak memakai token.
          </p>
          {berjalan && <p>Usulan AI sedang dibuat…</p>}
          {ai?.status === "gagal" && <p className="text-destructive">{ai.pesan}</p>}
          {ai?.status === "selesai" && (
            <p>
              Usulan AI ({ai.model}, {formatAngka((ai.tokenMasuk ?? 0) + (ai.tokenKeluar ?? 0), 0)} token) sudah diisikan ke tabel dan ditandai
              &quot;usulan AI&quot;. Periksa, lalu klik Simpan pemetaan.
            </p>
          )}
          {perkiraan && !berjalan && <div><TombolUsulanAi versiId={versi.id} perkiraan={perkiraan} /></div>}
        </AlertDescription>
      </Alert>
      <FormPemetaan
        key={ai?.selesai ?? "tanpa-ai"}
        usulanAi={aiSelesai}
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
