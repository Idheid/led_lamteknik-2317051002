import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { prisma } from "@/modules/bersama/db";
import { daftarButir } from "@/modules/led/data/instrumen";
import { JENJANG, namaJenjang } from "@/modules/bersama/domain/jenjang";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/modules/bersama/utils";

export const metadata: Metadata = { title: "Butir penilaian" };

export default async function HalamanButir({ params, searchParams }: PageProps<"/led/instrumen/[versiId]/butir">) {
  const p = await wajibPenanggungJawab();
  const { versiId } = await params;
  const q = await searchParams;
  const jenjang = typeof q.jenjang === "string" && JENJANG.some((j) => j.kode === q.jenjang) ? q.jenjang : "S1";
  const versi = await prisma.versiInstrumen.findUnique({ where: { id: versiId }, include: { _count: { select: { proyek: true } } } });
  if (!versi) notFound();
  const butir = await daftarButir(p, versiId, jenjang);
  const total = butir.reduce((s, b) => s + Number(b.bobot), 0);
  const terkunci = versi._count.proyek > 0;
  return (
    <>
      <JudulHalaman
        judul={`Butir penilaian ${namaJenjang(jenjang)}`}
        remah={[
          { label: "Instrumen", href: "/led/instrumen" },
          { label: versi.kode, href: `/led/instrumen/${versiId}` },
          { label: `Butir ${jenjang}` },
        ]}
        aksi={
          !terkunci && (
            <Button asChild>
              <Link href={`/led/instrumen/${versiId}/butir/baru?jenjang=${jenjang}`}>
                <Plus aria-hidden />
                Tambah butir
              </Link>
            </Button>
          )
        }
      />
      <Petunjuk
        kunci="admin-butir"
        fungsi="Daftar butir penilaian untuk satu jenjang beserta bobot, jenis (angka atau deskriptif), dan pemetaannya."
        langkah={[
          "Pilih butir untuk mengubah deskriptor dan unsur skor 4, tabel LKPS, dokumen pendukung, dan sub-bagian tujuan.",
          "Pastikan setiap butir terpetakan ke sub-bagian agar ikut dibahas saat generate.",
        ]}
      />
      <nav className="flex flex-wrap gap-1.5" aria-label="Pilih jenjang">
        {JENJANG.map((j) => (
          <Link
            key={j.kode}
            href={`/led/instrumen/${versiId}/butir?jenjang=${j.kode}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              j.kode === jenjang ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {j.kode}
          </Link>
        ))}
      </nav>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          {butir.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Belum ada butir untuk jenjang ini. Proyek dengan jenjang {namaJenjang(jenjang)} belum bisa dibuat dari versi ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Kode</TableHead>
                  <TableHead>Elemen dan indikator</TableHead>
                  <TableHead>Bagian</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Bobot</TableHead>
                  <TableHead>Sub-bagian</TableHead>
                  <TableHead className="w-12 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {butir.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-4 align-top font-mono text-xs">{b.kode}</TableCell>
                    <TableCell className="max-w-lg whitespace-normal align-top">
                      <div className="font-medium">{b.elemen}</div>
                      <div className="text-xs text-muted-foreground">{b.indikator}</div>
                    </TableCell>
                    <TableCell className="align-top font-mono text-xs">{b.bagianKode}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant={b.jenis === "angka" ? "secondary" : "outline"}>{b.jenis}</Badge>
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">{formatAngka(Number(b.bobot))}</TableCell>
                    <TableCell className="align-top font-mono text-xs">
                      {b.subBagian.map((r) => r.subBagian.kode).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right align-top">
                      <Button asChild variant="ghost" size="icon-sm" aria-label={`Ubah butir ${b.kode}`}>
                        <Link href={`/led/instrumen/${versiId}/butir/${b.id}`}>
                          <Pencil aria-hidden />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="pl-4">{butir.length} baris butir</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAngka(total)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
