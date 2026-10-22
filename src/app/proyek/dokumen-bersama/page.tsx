import type { Metadata } from "next";
import Link from "next/link";
import { FileImage, FileText } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarDokumenBersama, pilihanSubBagianBersama } from "@/lib/data/dokumen";
import { daftarKunci } from "@/lib/data/kunci-api";
import { pakaiPenyediaUji } from "@/lib/llm/embedding";
import { fmtWaktu, formatUkuran, STATUS_BERJALAN } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { Petunjuk } from "@/components/petunjuk";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnggahDokumenUmum } from "@/app/proyek/[proyekId]/dokumen/unggah-umum";
import { AksiDokumen } from "@/app/proyek/[proyekId]/dokumen/aksi-dokumen";

export const metadata: Metadata = { title: "Dokumen bersama fakultas" };

export default async function HalamanDokumenBersama() {
  const p = await wajibPenanggungJawab();
  const [dokumen, pilihan, kunci] = await Promise.all([daftarDokumenBersama(p), pilihanSubBagianBersama(p), daftarKunci(p)]);
  const namaSub = new Map(pilihan.map((s) => [s.kode, s.label]));
  return (
    <ShellDaftarProyek pengguna={p}>
      <PemantauProses aktif={dokumen.some((d) => STATUS_BERJALAN.includes(d.status))} />
      <JudulHalaman
        judul="Dokumen bersama fakultas"
        deskripsi="Dokumen fakultas yang berlaku untuk semua prodi. Diunggah dan diindeks sekali, lalu ikut dicari saat menyusun narasi setiap LED dengan kode sumber U1, U2, …"
      />
      <Petunjuk
        kunci="pj-dokumen-bersama"
        fungsi="Menghindari dokumen fakultas yang sama diunggah berulang kali untuk setiap LED. Dokumen ini juga tampil di menu Dokumen tiap LED dan otomatis dipakai saat menyusun narasi."
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
                  {dokumen.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">Belum ada dokumen bersama fakultas.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Dokumen</TableHead>
                          <TableHead>Sub-bagian</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Potongan</TableHead>
                          <TableHead className="w-12 pr-4" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dokumen.map((d) => (
                          <TableRow key={d.id} className="align-top">
                            <TableCell className="max-w-80 pl-4">
                              <a href={`/api/dokumen/${d.id}/berkas`} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium hover:underline">
                                {d.jenis === "gambar" ? <FileImage className="size-4 shrink-0" aria-hidden /> : <FileText className="size-4 shrink-0" aria-hidden />}
                                <span className="truncate">{d.namaBerkas}</span>
                              </a>
                              {d.judul && <div className="text-xs">Judul: {d.judul}</div>}
                              <div className="text-xs text-muted-foreground">{d.jenis.toUpperCase()} · {formatUkuran(d.ukuran)} · {fmtWaktu.format(d.createdAt)}</div>
                              {d.pesan && <div className="text-xs text-destructive">{d.pesan}</div>}
                            </TableCell>
                            <TableCell className="max-w-56 whitespace-normal text-xs">
                              {d.subBagianKode ? namaSub.get(d.subBagianKode) ?? d.subBagianKode : <span className="text-muted-foreground">Umum</span>}
                            </TableCell>
                            <TableCell><LencanaProses status={d.status} /></TableCell>
                            <TableCell className="text-right tabular-nums">{d.jenis === "gambar" ? "—" : d.jumlahPotongan}</TableCell>
                            <TableCell className="pr-4 text-right">
                              <AksiDokumen proyekId="" id={d.id} nama={d.namaBerkas} jenis={d.jenis} judul={d.judul} tautanBukti={d.tautanBukti} tahunTerbit={d.tahunTerbit} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
      </div>
    </ShellDaftarProyek>
  );
}
