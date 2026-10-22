import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarVersi } from "@/lib/data/instrumen";
import { JENJANG, namaJenjang } from "@/lib/domain/instrumen";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiVersi, SaklarAktifVersi } from "./komponen-versi";
import { TombolInstrumenBaru } from "./form-instrumen-baru";

const LABEL_STATUS: Record<string, string> = {
  draf: "Draf", diekstrak: "Perlu dicek", dicek: "Dicek", aktif: "Aktif", nonaktif: "Nonaktif",
};

export const metadata: Metadata = { title: "Instrumen" };

export default async function HalamanInstrumen() {
  const p = await wajibPenanggungJawab();
  const versi = await daftarVersi(p);
  const kodeById = new Map(versi.map((v) => [v.id, v.kode]));
  return (
    <>
      <JudulHalaman
        judul="Instrumen"
        deskripsi="Instrumen LAM Teknik per jenjang"
        aksi={<TombolInstrumenBaru tahun={new Date().getFullYear()} />}
      />
      <Petunjuk
        kunci="instrumen-unggah"
        fungsi="Daftar instrumen per jenjang. Butir penilaian dan pertanyaan diambil dari berkas resmi LAM Teknik, bukan diketik ulang."
        langkah={[
          "Klik Instrumen baru, pilih jenjang.",
          "Unggah Template LED (.docx), Matriks Penilaian (.pdf), dan Pedoman Penilaian (.pdf) beserta halaman tabel bobotnya.",
          "Klik Mulai ekstraksi. Template diurai tanpa AI; tabel matriks dibaca AI sedikit demi sedikit.",
          "Buka Periksa hasil: bandingkan tabel dengan PDF asli, perbaiki, lalu tandai setiap butir sudah dicek.",
          "Klik Sudah dicek, aktifkan. Instrumen lama jenjang itu dinonaktifkan tetapi tetap tersimpan.",
        ]}
      />
      <Card>
        <CardContent>
          <h2 className="mb-3 text-sm font-medium">Instrumen aktif per jenjang</h2>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {JENJANG.map((j) => {
              const aktif = versi.find((v) => v.aktif && v.jenjangUtama === j.kode) ?? versi.find((v) => v.aktif && !v.jenjangUtama && j.kode === "S1" && v._count.butir > 0);
              const proses = versi.find((v) => v.jenjangUtama === j.kode && (v.status === "draf" || v.status === "diekstrak"));
              return (
                <li key={j.kode} className="flex items-baseline justify-between gap-3 border-b py-1 last:border-0">
                  <span>{j.nama} <span className="text-muted-foreground">({j.kode})</span></span>
                  <span className="text-right">
                    {aktif
                      ? <Link href={`/proyek/instrumen/${aktif.id}`} className="font-mono text-xs hover:underline">{aktif.kode}</Link>
                      : <span className="text-xs text-muted-foreground">belum ada</span>}
                    {proses && (
                      <Link href={`/proyek/instrumen/${proses.id}`} className="ml-2 text-xs text-primary hover:underline">
                        {LABEL_STATUS[proses.status]}: {proses.kode}
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Versi</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>{v.jenjangUtama ? namaJenjang(v.jenjangUtama) : <span className="text-muted-foreground">lintas jenjang (lama)</span>}</TableCell>
                  <TableCell><Badge variant={v.status === "aktif" ? "default" : "outline"}>{LABEL_STATUS[v.status] ?? v.status}</Badge></TableCell>
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
