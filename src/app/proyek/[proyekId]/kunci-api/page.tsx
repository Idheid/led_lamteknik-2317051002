import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarKunci } from "@/lib/data/kunci-api";
import { pakaiPenyediaUji } from "@/lib/llm/embedding";
import { fmtWaktu } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiKunci, FormKunci } from "./komponen";

export const metadata: Metadata = { title: "Kunci API" };

const LABEL_STATUS: Record<string, { label: string; varian: "secondary" | "destructive" | "outline" }> = {
  aktif: { label: "Aktif", varian: "secondary" },
  kuota_habis: { label: "Kuota habis", varian: "outline" },
  tidak_valid: { label: "Tidak valid", varian: "destructive" },
  nonaktif: { label: "Nonaktif", varian: "outline" },
};

export default async function HalamanKunci({ params }: PageProps<"/proyek/[proyekId]/kunci-api">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const kunci = await daftarKunci(p);
  return (
    <>
      <JudulHalaman
        judul="Kunci API Gemini"
        deskripsi="Kunci dipakai untuk membuat embedding dokumen (sekarang) dan menyusun narasi (iterasi berikutnya). Kunci disimpan terenkripsi dan tidak pernah ditampilkan lagi; hanya 4 karakter terakhir yang terlihat."
        remah={[{ label: "Beranda", href: `/proyek/${proyekId}` }, { label: "Kunci API" }]}
      />
      {pakaiPenyediaUji() && (
        <Alert>
          <AlertTitle>Mode uji aktif</AlertTitle>
          <AlertDescription>EMBEDDING_PENYEDIA=uji: dokumen diindeks dengan embedding uji lokal tanpa memanggil Gemini.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah kunci</CardTitle>
            <CardDescription>Buat kunci di Google AI Studio (aistudio.google.com) → Get API key.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormKunci proyekId={proyekId} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card className="py-0">
            <CardContent className="px-0">
              {kunci.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Belum ada kunci API.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Label</TableHead>
                      <TableHead>Kunci</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ditambahkan</TableHead>
                      <TableHead className="w-12 pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kunci.map((k) => {
                      const s = LABEL_STATUS[k.statusEfektif] ?? LABEL_STATUS.nonaktif;
                      return (
                        <TableRow key={k.id}>
                          <TableCell className="pl-4 font-medium">{k.label}</TableCell>
                          <TableCell className="font-mono text-xs">••••{k.akhiran}</TableCell>
                          <TableCell>
                            <Badge variant={s.varian}>{s.label}</Badge>
                            {k.statusEfektif === "kuota_habis" && k.habisSampai && (
                              <div className="text-xs text-muted-foreground">sampai {fmtWaktu.format(k.habisSampai)} WIB</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtWaktu.format(k.createdAt)}</TableCell>
                          <TableCell className="pr-4 text-right"><AksiKunci proyekId={proyekId} id={k.id} label={k.label} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Alert>
            <ShieldCheck aria-hidden />
            <AlertTitle>Privasi dan kuota</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                <li>Pada layanan gratis, Google boleh memakai isi permintaan untuk pengembangan produk. Hindari mengunggah dokumen berisi data pribadi (NIK, NIM, nilai mahasiswa) bila memakai kunci gratis.</li>
                <li>Kuota dihitung per project Google, bukan per kunci. Kunci tambahan hanya menambah kuota bila dibuat di project lain.</li>
                <li>Kuota harian direset tengah malam waktu Pasifik (sekitar 14.00–15.00 WIB).</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  );
}
