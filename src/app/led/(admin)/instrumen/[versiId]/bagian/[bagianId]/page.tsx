import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pencil, Plus } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilBagian } from "@/modules/led/data/instrumen";
import { jenjangBerlaku } from "@/modules/led/domain/instrumen";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormBagian } from "./form-bagian";
import { TombolHapusSubBagian } from "./tombol-hapus-sub";

export const metadata: Metadata = { title: "Bagian instrumen" };

export default async function HalamanBagian({ params }: PageProps<"/led/instrumen/[versiId]/bagian/[bagianId]">) {
  const p = await wajibAdmin();
  const { versiId, bagianId } = await params;
  const b = await ambilBagian(p, bagianId);
  if (!b || b.versi.id !== versiId) notFound();
  const terkunci = b.versi._count.proyek > 0;
  return (
    <>
      <JudulHalaman
        judul={`${b.kode} · ${b.nama}`}
        remah={[
          { label: "Instrumen", href: "/led/instrumen" },
          { label: b.versi.kode, href: `/led/instrumen/${versiId}` },
          { label: b.kode },
        ]}
        aksi={
          !terkunci && (
            <Button asChild>
              <Link href={`/led/instrumen/${versiId}/sub-bagian/baru?bagian=${b.id}`}>
                <Plus aria-hidden />
                Tambah sub-bagian
              </Link>
            </Button>
          )
        }
      />
      <Petunjuk
        kunci="admin-bagian"
        fungsi="Pengaturan satu bagian LED dan daftar sub-bagiannya (misalnya Latar Belakang, Kebijakan, IKU, Analisis Faktor, SWOT)."
        langkah={[
          "Ubah nama, urutan, batas halaman resmi, atau pengantar bagian bila diperlukan.",
          "Tambah atau sunting sub-bagian beserta pertanyaan pemandu dan bobot halamannya.",
        ]}
      />
      {terkunci && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Versi ini dipakai proyek dan dikunci. Salin versi untuk mengubah isinya.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sub-bagian ({b.subBagian.length})</CardTitle>
            <CardDescription>Urutan di sini menjadi urutan isian di halaman form penyusun.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">No.</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Berlaku untuk</TableHead>
                  <TableHead>Butir</TableHead>
                  <TableHead className="w-20 pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.subBagian.map((s) => {
                  const jenjang = jenjangBerlaku(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="pl-6 align-top font-mono text-xs">{s.label || "—"}</TableCell>
                      <TableCell className="max-w-md whitespace-normal align-top">
                        {s.grup && <div className="text-xs text-muted-foreground">{s.grup}</div>}
                        <div className="font-medium">{s.judul}</div>
                        <div className="font-mono text-xs text-muted-foreground">{s.kode}</div>
                      </TableCell>
                      <TableCell className="align-top"><Badge variant="outline">{s.tipe}</Badge></TableCell>
                      <TableCell className="max-w-48 whitespace-normal align-top text-xs">
                        {jenjang.length === 10 ? "Semua jenjang" : jenjang.join(", ")}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {s.butir.length > 0 ? s.butir.map((r) => `${r.butir.kode} (${r.butir.jenjang})`).join(", ") : "—"}
                      </TableCell>
                      <TableCell className="pr-6 text-right align-top">
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Ubah ${s.kode}`}>
                          <Link href={`/led/instrumen/${versiId}/sub-bagian/${s.id}`}>
                            <Pencil aria-hidden />
                          </Link>
                        </Button>
                        {!terkunci && <TombolHapusSubBagian id={s.id} kode={s.kode} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Pengaturan bagian</CardTitle>
          </CardHeader>
          <CardContent>
            <FormBagian
              id={b.id}
              terkunci={terkunci}
              awal={{ nama: b.nama, urutan: b.urutan, batasHalamanResmi: b.batasHalamanResmi, pengantar: b.pengantar ?? "" }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
