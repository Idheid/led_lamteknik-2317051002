import type { Metadata } from "next";
import Link from "next/link";
import { FileImage, FileText } from "lucide-react";
import { wajibSuperAdmin } from "@/lib/sesi";
import { daftarUpps } from "@/lib/data/organisasi";
import { daftarDokumenUpps, pilihanSubBagianUpps } from "@/lib/data/dokumen";
import { daftarKunci } from "@/lib/data/kunci-api";
import { pakaiPenyediaUji } from "@/lib/llm/embedding";
import { fmtWaktu, formatUkuran, STATUS_BERJALAN } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnggahDokumenUmum } from "@/app/proyek/[proyekId]/dokumen/unggah-umum";
import { AksiDokumen } from "@/app/proyek/[proyekId]/dokumen/aksi-dokumen";

export const metadata: Metadata = { title: "Bahan bersama UPPS" };

export default async function HalamanBahanUpps({ searchParams }: PageProps<"/admin/bahan-upps">) {
  const p = await wajibSuperAdmin();
  const q = await searchParams;
  const upps = await daftarUpps(p);
  const pilih = upps.find((u) => u.id === q.upps) ?? upps[0];
  const [dokumen, pilihan, kunci] = await Promise.all([
    pilih ? daftarDokumenUpps(p, pilih.id) : Promise.resolve([]),
    pilihanSubBagianUpps(p),
    daftarKunci(p),
  ]);
  const namaSub = new Map(pilihan.map((s) => [s.kode, s.label]));
  return (
    <>
      <PemantauProses aktif={dokumen.some((d) => STATUS_BERJALAN.includes(d.status))} />
      <JudulHalaman
        judul="Bahan bersama UPPS"
        deskripsi="Dokumen fakultas (UPPS) yang berlaku untuk semua prodi di bawahnya. Diunggah dan diindeks sekali, lalu ikut dicari saat menyusun narasi setiap prodi dengan kode sumber U1, U2, …"
      />
      <Petunjuk
        kunci="admin-bahan-upps"
        fungsi="Menghindari setiap prodi mengunggah dokumen fakultas yang sama berulang kali. Penanggung jawab prodi melihat bahan ini di menu Dokumen (hanya baca), dan narasinya otomatis memakai bahan ini."
        langkah={[
          "Pilih UPPS (fakultas).",
          "Unggah dokumen bersama: VMTS UPPS dan Renstra, SK struktur organisasi, laporan keuangan, sarana-prasarana dan K3L, dokumen SPMI dan audit mutu internal.",
          "Kaitkan ke sub-bagian bila dokumen khusus satu bagian; biarkan Umum bila dipakai banyak bagian.",
          "Bahan diindeks dengan kunci API cadangan super admin; pastikan kunci itu tersedia.",
        ]}
      />
      {kunci.length === 0 && !pakaiPenyediaUji() && (
        <Alert>
          <AlertTitle>Belum ada kunci API cadangan</AlertTitle>
          <AlertDescription>
            Bahan bersama diindeks dengan kunci cadangan super admin. <Link className="underline" href="/admin/kunci-api">Tambahkan kunci</Link> agar dokumen bisa dicari.
          </AlertDescription>
        </Alert>
      )}
      {upps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada UPPS. Tambahkan di menu Prodi dan UPPS.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {upps.map((u) => (
              <Button key={u.id} asChild size="sm" variant={u.id === pilih?.id ? "secondary" : "ghost"}>
                <Link href={`/admin/bahan-upps?upps=${u.id}`}>{u.nama} <span className="text-muted-foreground">({u.prodi.length} prodi)</span></Link>
              </Button>
            ))}
          </div>
          {pilih && (
            <div className="grid gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Unggah bahan bersama</CardTitle>
                  <CardDescription>{pilih.nama}, {pilih.perguruanTinggi}: dipakai {pilih.prodi.length} prodi.</CardDescription>
                </CardHeader>
                <CardContent>
                  <UnggahDokumenUmum pilihan={pilihan} url={`/api/admin/upps/${pilih.id}/dokumen`} />
                </CardContent>
              </Card>
              <Card className="py-0 xl:col-span-2">
                <CardContent className="overflow-x-auto px-0">
                  {dokumen.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">Belum ada bahan bersama untuk UPPS ini.</p>
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
                              <AksiDokumen proyekId="" id={d.id} nama={d.namaBerkas} jenis={d.jenis} judul={d.judul} tautanBukti={d.tautanBukti} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}
