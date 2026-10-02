import type { Metadata } from "next";
import { FileImage, FileText } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarDokumen } from "@/lib/data/dokumen";
import { pilihanSubBagianProyek } from "@/lib/data/proyek";
import { daftarKunci } from "@/lib/data/kunci-api";
import { pakaiPenyediaUji } from "@/lib/llm/embedding";
import { fmtWaktu, formatUkuran } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { STATUS_BERJALAN } from "@/lib/tampil";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiDokumen } from "./aksi-dokumen";
import { PanelCari } from "./panel-cari";
import { UnggahDokumenUmum } from "./unggah-umum";

export const metadata: Metadata = { title: "Dokumen" };

export default async function HalamanDokumen({ params }: PageProps<"/proyek/[proyekId]/dokumen">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const [dokumen, pilihan, kunci] = await Promise.all([
    daftarDokumen(p, proyekId), pilihanSubBagianProyek(p, proyekId), daftarKunci(p),
  ]);
  const namaSub = new Map(pilihan.map((s) => [s.kode, s.label]));
  const berjalan = dokumen.some((d) => STATUS_BERJALAN.includes(d.status));
  const menungguKunci = dokumen.filter((d) => d.status === "menunggu_kunci").length;
  const tanpaKunci = kunci.length === 0 && !pakaiPenyediaUji();
  const siap = dokumen.filter((d) => d.status === "siap").length;

  return (
    <>
      <PemantauProses aktif={berjalan} />
      <JudulHalaman
        judul="Dokumen pendukung"
        deskripsi="PDF dan DOCX diekstrak, dipotong, dan diindeks (vektor + kata kunci) supaya bisa dipakai sebagai sumber narasi. Gambar disimpan utuh untuk disisipkan ke narasi."
        remah={[{ label: "Beranda", href: `/proyek/${proyekId}` }, { label: "Dokumen" }]}
      />
      {(tanpaKunci || menungguKunci > 0) && (
        <Alert>
          <AlertTitle>{tanpaKunci ? "Belum ada kunci API Gemini" : `${menungguKunci} dokumen menunggu kunci API`}</AlertTitle>
          <AlertDescription>
            Dokumen teks butuh kunci API untuk dibuat embedding-nya. Tambahkan kunci di menu Kunci API; dokumen yang tertahan
            akan diproses ulang otomatis.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Unggah dokumen</CardTitle>
            <CardDescription>Biasanya diunggah dari halaman kriteria agar langsung terkait butirnya. Di sini bisa untuk dokumen umum.</CardDescription>
          </CardHeader>
          <CardContent>
            <UnggahDokumenUmum proyekId={proyekId} pilihan={pilihan} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Uji pencarian</CardTitle>
            <CardDescription>
              Pencarian gabungan yang dipakai mesin penyusun: kemiripan vektor dan kata kunci, digabung reciprocal rank fusion.
              {siap === 0 && " Belum ada dokumen yang siap dicari."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PanelCari proyekId={proyekId} pilihan={pilihan} />
          </CardContent>
        </Card>
      </div>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          {dokumen.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Belum ada dokumen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Dokumen</TableHead>
                  <TableHead>Sub-bagian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Potongan</TableHead>
                  <TableHead>Tautan bukti</TableHead>
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
                      {d.dokumenDiharapkan && <div className="text-xs text-muted-foreground">Memenuhi: {d.dokumenDiharapkan.nama}</div>}
                      <div className="text-xs text-muted-foreground">{d.jenis.toUpperCase()} · {formatUkuran(d.ukuran)} · {fmtWaktu.format(d.createdAt)}</div>
                      {d.pesan && <div className="text-xs text-destructive">{d.pesan}</div>}
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-xs">{d.subBagianKode ? namaSub.get(d.subBagianKode) ?? d.subBagianKode : <span className="text-muted-foreground">Umum</span>}</TableCell>
                    <TableCell><LencanaProses status={d.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{d.jenis === "gambar" ? "—" : d.jumlahPotongan}</TableCell>
                    <TableCell className="max-w-48 truncate text-xs">
                      {d.tautanBukti ? <a href={d.tautanBukti} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{d.tautanBukti}</a> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <AksiDokumen proyekId={proyekId} id={d.id} nama={d.namaBerkas} jenis={d.jenis} judul={d.judul} tautanBukti={d.tautanBukti} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
