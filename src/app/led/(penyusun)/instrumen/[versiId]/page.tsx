import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Lock } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilVersi } from "@/modules/led/data/instrumen";
import { JENJANG, namaJenjang } from "@/modules/bersama/domain/jenjang";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TombolSalinVersi, SaklarAktifVersi } from "../komponen-versi";
import { FormVersi } from "./form-versi";
import { infoTemplateLed } from "@/modules/led/data/ekspor";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { BerkasSumber } from "./berkas-sumber";

export const metadata: Metadata = { title: "Detail versi instrumen" };

const LABEL_JENIS: Record<string, string> = {
  awal: "Halaman awal", bab: "Bab", butir: "Bab berbutir", kriteria: "Kriteria", lampiran: "Lampiran",
};

export default async function HalamanVersi({ params }: PageProps<"/led/instrumen/[versiId]">) {
  const p = await wajibAdmin();
  const { versiId } = await params;
  const v = await ambilVersi(p, versiId);
  if (!v) notFound();
  const peraturan = Array.isArray(v.peraturan) ? (v.peraturan as string[]) : [];
  const tpl = await infoTemplateLed(p, versiId);
  const perJenjang = new Map(v.butirPerJenjang.map((b) => [b.jenjang, b]));
  return (
    <>
      <JudulHalaman
        judul={v.nama}
        deskripsi={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{v.kode}</span>
            {v.disalinDari && (
              <>
                · disalin dari <Link className="underline" href={`/led/instrumen/${v.disalinDari.id}`}>{v.disalinDari.kode}</Link>
              </>
            )}
          </span>
        }
        remah={[{ label: "Instrumen", href: "/led/instrumen" }, { label: v.kode }]}
        aksi={
          <>
            <div className="flex items-center gap-2 rounded-md border px-3 text-sm">
              Aktif <SaklarAktifVersi id={v.id} aktif={v.aktif} />
            </div>
            <TombolSalinVersi id={v.id} />
          </>
        }
      />
      <Petunjuk
        kunci="admin-versi"
        fungsi="Satu instrumen jenjang: berkas sumber, hasil ekstraksi (bagian, sub-bagian, butir), dan status aktifnya."
        langkah={[
          "Unggah tiga berkas sumber, isi halaman tabel bobot, lalu klik Mulai ekstraksi.",
          "Setelah selesai, klik Periksa hasil ekstraksi untuk mencocokkan tabel dengan PDF asli dan mengaktifkan instrumen.",
          "Bagian dan sub-bagian bisa disunting dari daftar di bawah selama instrumen belum dipakai LED.",
        ]}
      />
      {v.jenjangUtama && <BerkasSumber v={v} />}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template LEDPS (Word) untuk ekspor</CardTitle>
          <CardDescription>
            {tpl.nama ? `Terpasang: ${tpl.nama}` : tpl.cadangan ? "Belum diunggah; memakai template cadangan dari TEMPLATE_LEDPS_PATH." : "Belum ada template. Unggah template LEDPS resmi (.docx)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {tpl.laporan && (
            <ul className="space-y-1">
              {Object.entries(tpl.laporan).map(([j, l]) => (
                <li key={j}>
                  <span className="font-mono">{j}</span>: {l.placeholder} sub-bagian dipetakan, {l.dihapus.length} dihapus (tidak berlaku)
                  {l.tidakDitemukan.length > 0 && <span className="text-destructive">, tidak ditemukan: {l.tidakDitemukan.join(", ")}</span>}
                </li>
              ))}
            </ul>
          )}
          {!v.jenjangUtama && !v.terkunci && <UnggahBerkas url={`/api/led/instrumen/${versiId}/berkas/template`} accept=".docx" label="Unggah template .docx" ringkas />}
        </CardContent>
      </Card>
      {v.terkunci && (
        <Alert>
          <Lock aria-hidden />
          <AlertTitle>Versi ini dikunci</AlertTitle>
          <AlertDescription>
            Dipakai {v._count.proyek} proyek LED, jadi isinya tidak bisa diubah agar proyek tersebut tidak berubah diam-diam.
            Salin versi ini untuk membuat perubahan.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Bagian dan kriteria</CardTitle>
            <CardDescription>Halaman form penyusun dibuat dari daftar ini; jumlah kriteria mengikuti data.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Sub-bagian</TableHead>
                  <TableHead className="w-10 pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.bagian.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer">
                    <TableCell className="pl-6 font-mono text-xs">{b.kode}</TableCell>
                    <TableCell>
                      <Link href={`/led/instrumen/${v.id}/bagian/${b.id}`} className="font-medium hover:underline">{b.nama}</Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{LABEL_JENIS[b.jenis] ?? b.jenis}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{b._count.subBagian}</TableCell>
                    <TableCell className="pr-6">
                      <Link href={`/led/instrumen/${v.id}/bagian/${b.id}`} aria-label={`Buka ${b.kode}`}>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Butir penilaian per jenjang</CardTitle>
              <CardDescription>Bobot dan butir berbeda per jenjang.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {(v.jenjangUtama ? JENJANG.filter((j) => j.kode === v.jenjangUtama) : JENJANG).map((j) => {
                  const b = perJenjang.get(j.kode);
                  return (
                    <li key={j.kode} className="flex items-center justify-between py-2">
                      <Link href={`/led/instrumen/${v.id}/butir?jenjang=${j.kode}`} className="hover:underline">
                        {j.nama} <span className="text-muted-foreground">({j.kode})</span>
                      </Link>
                      {b ? (
                        <span className="tabular-nums text-muted-foreground">
                          {b._count._all} butir · bobot {formatAngka(Number(b._sum.bobot ?? 0))}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">belum diisi</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identitas versi</CardTitle>
              {peraturan.length > 0 && (
                <CardDescription>
                  <ul className="list-disc pl-4">
                    {peraturan.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <FormVersi id={v.id} terkunci={v.terkunci} awal={{ nama: v.nama, kode: v.kode, catatan: v.catatan ?? "" }} />
            </CardContent>
          </Card>
          <Button asChild variant="outline">
            <Link href={`/led/instrumen/${v.id}/butir?jenjang=${v.jenjangUtama ?? "S1"}`}>Kelola butir {namaJenjang(v.jenjangUtama ?? "S1")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
