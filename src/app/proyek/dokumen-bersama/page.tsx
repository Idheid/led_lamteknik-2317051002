import type { Metadata } from "next";
import Link from "next/link";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarDokumenBersama, pilihanSubBagianBersama } from "@/lib/data/dokumen";
import { daftarKunci } from "@/lib/data/kunci-api";
import { pakaiPenyediaUji } from "@/lib/llm/embedding";
import { STATUS_BERJALAN } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { Petunjuk } from "@/components/petunjuk";
import { PemantauProses } from "@/components/status-proses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnggahDokumenUmum } from "@/app/proyek/[proyekId]/dokumen/unggah-umum";
import { TabelDokumen } from "@/components/basis-pengetahuan/tabel-dokumen";

export const metadata: Metadata = { title: "Basis Pengetahuan fakultas" };

export default async function HalamanDokumenBersama() {
  const p = await wajibPenanggungJawab();
  const [dokumen, pilihan, kunci] = await Promise.all([daftarDokumenBersama(p), pilihanSubBagianBersama(p), daftarKunci(p)]);
  const namaSub = new Map(pilihan.map((s) => [s.kode, s.label]));
  return (
    <ShellDaftarProyek pengguna={p}>
      <PemantauProses aktif={dokumen.some((d) => STATUS_BERJALAN.includes(d.status))} />
      <JudulHalaman
        judul="Basis Pengetahuan fakultas"
        deskripsi="Dokumen bersama fakultas yang berlaku untuk semua prodi. Diunggah dan diindeks sekali, lalu ikut dicari saat menyusun narasi setiap LED dengan kode sumber U1, U2, …. Di dalam LED, dokumen ini tampil di tab kedua menu Basis Pengetahuan."
      />
      <Petunjuk
        kunci="pj-dokumen-bersama"
        fungsi="Menghindari dokumen fakultas yang sama diunggah berulang kali untuk setiap LED. Dokumen ini juga tampil di tab Dokumen bersama fakultas pada menu Basis Pengetahuan tiap LED dan otomatis dipakai saat menyusun narasi."
        langkah={[
          "Unggah dokumen bersama: VMTS UPPS dan Renstra, SK struktur organisasi, laporan keuangan, sarana-prasarana dan K3L, dokumen SPMI dan audit mutu internal.",
          "Kaitkan ke sub-bagian bila dokumen khusus satu bagian; biarkan Umum bila dipakai banyak bagian.",
          "Dokumen diindeks dengan kunci API fakultas; pastikan ada kunci di menu Kunci API fakultas.",
        ]}
      />
      {kunci.length === 0 && !pakaiPenyediaUji() && (
        <Alert>
          <AlertTitle>Belum ada kunci API fakultas</AlertTitle>
          <AlertDescription>
            <Link className="underline" href="/proyek/kunci-api">Tambahkan kunci</Link> agar dokumen bisa diindeks dan dicari.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unggah dokumen bersama</CardTitle>
            <CardDescription>Dipakai semua LED di fakultas.</CardDescription>
          </CardHeader>
          <CardContent>
            <UnggahDokumenUmum pilihan={pilihan} url="/api/dokumen-bersama" />
          </CardContent>
        </Card>
        <Card className="py-0 xl:col-span-2">
          <CardContent className="overflow-x-auto px-0">
            <TabelDokumen dokumen={dokumen} namaSub={namaSub} proyekId="" bolehUbah />
          </CardContent>
        </Card>
      </div>
    </ShellDaftarProyek>
  );
}
