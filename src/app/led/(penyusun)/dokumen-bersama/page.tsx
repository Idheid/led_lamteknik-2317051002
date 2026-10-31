import type { Metadata } from "next";
import Link from "next/link";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { daftarDokumenBersama, pilihanSubBagianBersama } from "@/modules/led/data/dokumen";
import { daftarKunci } from "@/modules/bersama/data/kunci-api";
import { pakaiPenyediaUji } from "@/modules/bersama/llm/embedding";
import { STATUS_BERJALAN } from "@/modules/bersama/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { Petunjuk } from "@/components/petunjuk";
import { PemantauProses } from "@/components/status-proses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TabelDokumen } from "@/modules/led/komponen/basis-pengetahuan/tabel-dokumen";

export const metadata: Metadata = { title: "Basis Pengetahuan fakultas" };

export default async function HalamanDokumenBersama() {
  const p = await wajibPenanggungJawab();
  const [dokumen, pilihan, kunci] = await Promise.all([daftarDokumenBersama(p), pilihanSubBagianBersama(p), daftarKunci(p)]);
  const namaSub = new Map(pilihan.map((s) => [s.kode, s.label]));
  return (
    <ShellMenuLed pengguna={p}>
      <PemantauProses aktif={dokumen.some((d) => STATUS_BERJALAN.includes(d.status))} />
      <JudulHalaman
        judul="Basis Pengetahuan fakultas"
        deskripsi="Dokumen bersama untuk semua LED"
        aksi={<Button asChild size="lg"><Link href="/led/dokumen-bersama/tambah"><Plus aria-hidden />Tambah dokumen</Link></Button>}
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
            <Link className="underline" href="/pengaturan/kunci-api">Tambahkan kunci</Link> agar dokumen bisa diindeks dan dicari.
          </AlertDescription>
        </Alert>
      )}
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <TabelDokumen dokumen={dokumen} namaSub={namaSub} proyekId="" bolehUbah />
        </CardContent>
      </Card>
    </ShellMenuLed>
  );
}
