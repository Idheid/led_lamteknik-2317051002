import type { Metadata } from "next";
import Link from "next/link";
import { wajibAsesor } from "@/modules/bersama/sesi";
import { ledAsesor } from "@/modules/led/data/review";
import { LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MENU_ASESOR } from "./menu";

export const metadata: Metadata = { title: "LED ditugaskan" };

const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

/** Beranda asesor (revisi 22 Okt 2026): LED yang ditugaskan admin, status review, dan jumlah catatan. */
export default async function HalamanAsesor() {
  const p = await wajibAsesor();
  const led = await ledAsesor(p);
  return (
    <ShellAplikasi pengguna={p} grup={[MENU_ASESOR]} subjudul="Reviewer LPMPP" beranda="/led/asesor">
      <JudulHalaman judul="LED ditugaskan" />
      <Petunjuk
        kunci="asesor-beranda"
        fungsi="Mereview LED sebelum diajukan ke LAM Teknik."
        langkah={[
          "Tunggu Tim Prodi menekan Ajukan review (status Direview).",
          "Buka sub-bagian, blok kalimat, lalu tulis catatan revisi. Catatan langsung muncul di layar Tim Prodi.",
          "Setelah Tim Prodi menandai Sudah diperbaiki, bandingkan versi lalu Terima atau Buka lagi.",
          "Bila semua catatan diterima, isi skor 0–4 per butir di Penilaian akhir dan nyatakan Layak diajukan atau Perlu revisi.",
        ]}
      />
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">LED</TableHead>
                <TableHead>Batas pengajuan</TableHead>
                <TableHead>Status review</TableHead>
                <TableHead className="pr-4">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {led.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Belum ada LED yang ditugaskan kepada Anda.</TableCell></TableRow>
              )}
              {led.map((l) => (
                <TableRow key={l.id} className={l.diarsipkanPada ? "opacity-60" : undefined}>
                  <TableCell className="pl-4">
                    <Link href={`/led/asesor/${l.id}`} className="font-medium text-primary hover:underline">{l.prodi.nama} ({l.jenjang})</Link>
                    <div className="text-xs text-muted-foreground">{l.nama}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.batasPengajuan ? fmt.format(l.batasPengajuan) : "—"}</TableCell>
                  <TableCell><Badge variant={l.review === "direview" ? "default" : "outline"}>{LABEL_REVIEW[l.review]}</Badge></TableCell>
                  <TableCell className="pr-4 text-sm text-muted-foreground">
                    {l.catatan.terbuka} terbuka · {l.catatan.diperbaiki} diperbaiki · {l.catatan.diterima} diterima
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ShellAplikasi>
  );
}
