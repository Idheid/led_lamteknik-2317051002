import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarVersi } from "@/lib/data/instrumen";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiVersi, SaklarAktifVersi } from "./komponen-versi";

export const metadata: Metadata = { title: "Instrumen" };

export default async function HalamanInstrumen() {
  const p = await wajibPenanggungJawab();
  const versi = await daftarVersi(p);
  const kodeById = new Map(versi.map((v) => [v.id, v.kode]));
  return (
    <>
      <JudulHalaman
        judul="Versi instrumen"
        deskripsi="Instrumen disimpan per versi. Versi yang sudah dipakai proyek dikunci; untuk mengikuti peraturan baru, salin versi lalu sunting salinannya. Hanya versi aktif yang bisa dipilih saat membuat proyek."
      />
      <Petunjuk
        kunci="admin-instrumen"
        fungsi="Daftar versi instrumen LED. Versi yang sudah dipakai proyek dikunci agar proyek lama tetap konsisten."
        langkah={[
          "Buka versi untuk melihat bagian, sub-bagian, dan butir penilaian.",
          "Untuk mengikuti peraturan baru, salin versi lalu sunting salinannya.",
          "Aktifkan versi agar bisa dipilih saat penanggung jawab membuat proyek.",
        ]}
      />
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Versi</TableHead>
                <TableHead>Lembaga</TableHead>
                <TableHead className="text-right">Bagian</TableHead>
                <TableHead className="text-right">Butir</TableHead>
                <TableHead className="text-right">Dipakai proyek</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="w-12 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {versi.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="pl-4">
                    <Link href={`/proyek/instrumen/${v.id}`} className="font-medium hover:underline">{v.nama}</Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{v.kode}</span>
                      {v.disalinDariId && <span>disalin dari {kodeById.get(v.disalinDariId) ?? "versi terhapus"}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{v.lembaga}</TableCell>
                  <TableCell className="text-right tabular-nums">{v._count.bagian}</TableCell>
                  <TableCell className="text-right tabular-nums">{v._count.butir}</TableCell>
                  <TableCell className="text-right">
                    {v._count.proyek > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="size-3" aria-hidden />
                        {v._count.proyek} proyek
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SaklarAktifVersi id={v.id} aktif={v.aktif} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <AksiVersi id={v.id} kode={v.kode} dipakai={v._count.proyek > 0} />
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
