import { FileImage, FileText } from "lucide-react";
import { fmtWaktu, formatUkuran } from "@/lib/tampil";
import { LencanaProses } from "@/components/status-proses";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiDokumen } from "@/app/proyek/[proyekId]/dokumen/aksi-dokumen";
import { LihatPotongan } from "./lihat-potongan";

export interface BarisDokumen {
  id: string;
  namaBerkas: string;
  jenis: string;
  judul: string | null;
  ukuran: number;
  createdAt: Date;
  pesan: string | null;
  status: string;
  jumlahPotongan: number;
  tautanBukti: string | null;
  tahunTerbit: number | null;
  subBagianKode: string | null;
  dokumenDiharapkan: { nama: string } | null;
}

/**
 * Tabel dokumen Basis Pengetahuan (revisi 22 Okt 2026): status, jumlah potongan (klik untuk melihat isinya), tahun
 * terbit untuk rujukan Word, dan tautan bukti. Dipakai tab Dokumen LED ini dan Dokumen bersama fakultas.
 */
export function TabelDokumen({ dokumen, namaSub, proyekId, bolehUbah }: {
  dokumen: BarisDokumen[];
  namaSub: Map<string, string>;
  /** "" untuk dokumen bersama fakultas */
  proyekId: string;
  bolehUbah: boolean;
}) {
  if (dokumen.length === 0) return <p className="p-8 text-center text-sm text-muted-foreground">Belum ada dokumen.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Dokumen</TableHead>
          <TableHead>Sub-bagian</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Potongan</TableHead>
          <TableHead>Tahun</TableHead>
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
            <TableCell className="max-w-56 whitespace-normal text-xs">
              {d.subBagianKode ? namaSub.get(d.subBagianKode) ?? d.subBagianKode : <span className="text-muted-foreground">Umum</span>}
            </TableCell>
            <TableCell><LencanaProses status={d.status} /></TableCell>
            <TableCell className="text-right">
              {d.jenis === "gambar" ? <span className="text-muted-foreground">—</span> : <LihatPotongan dokumenId={d.id} nama={d.namaBerkas} jumlah={d.jumlahPotongan} />}
            </TableCell>
            <TableCell className="tabular-nums">
              {d.tahunTerbit ?? (d.jenis === "gambar" ? <span className="text-muted-foreground">—</span> : <Badge variant="outline" title="Rujukan Word memakai t.t. (tanpa tahun)">t.t.</Badge>)}
            </TableCell>
            <TableCell className="max-w-48 truncate text-xs">
              {d.tautanBukti
                ? <a href={d.tautanBukti} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{d.tautanBukti}</a>
                : <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="pr-4 text-right">
              {bolehUbah && (
                <AksiDokumen proyekId={proyekId} id={d.id} nama={d.namaBerkas} jenis={d.jenis} judul={d.judul} tautanBukti={d.tautanBukti} tahunTerbit={d.tahunTerbit} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
