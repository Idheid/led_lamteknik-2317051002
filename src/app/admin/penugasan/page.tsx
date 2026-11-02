import type { Metadata } from "next";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { daftarPenugasan } from "@/modules/led/data/review";
import { bacaStatusReview, LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PilihAsesor } from "./pilih-asesor";

export const metadata: Metadata = { title: "Penugasan reviewer LPMPP" };

const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

/** Revisi 22 Okt 2026: satu asesor per LED, ditugaskan admin. */
export default async function HalamanPenugasan() {
  const p = await wajibAdmin();
  const { led, asesor } = await daftarPenugasan(p);
  return (
    <>
      <JudulHalaman
        judul="Penugasan reviewer LPMPP"
        deskripsi="Satu LED direview satu reviewer LPMPP (peran Reviewer LPMPP di Kelola akun)"
      />
      {asesor.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada akun reviewer LPMPP aktif. Buat dulu di Kelola akun → Tambah akun → peran Reviewer LPMPP.</p>
      )}
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">LED</TableHead>
                <TableHead>Batas pengajuan</TableHead>
                <TableHead>Status review</TableHead>
                <TableHead className="w-64 pr-4">Reviewer LPMPP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {led.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Belum ada LED. Tim Prodi membuat LED prodinya di modul LED.</TableCell></TableRow>
              )}
              {led.map((l) => (
                <TableRow key={l.id} className={l.diarsipkanPada ? "opacity-60" : undefined}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{l.prodi.nama} <span className="text-muted-foreground">({l.jenjang})</span></div>
                    <div className="text-xs text-muted-foreground">{l.nama}{l.diarsipkanPada ? " · diarsipkan" : ""}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.batasPengajuan ? fmt.format(l.batasPengajuan) : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{LABEL_REVIEW[bacaStatusReview(l.statusReview)]}</Badge></TableCell>
                  <TableCell className="pr-4">
                    <PilihAsesor proyekId={l.id} asesorId={l.asesor?.id ?? null} pilihan={asesor.map((a) => ({ id: a.id, nama: a.name }))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
