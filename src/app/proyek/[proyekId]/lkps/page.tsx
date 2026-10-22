import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronRight, CircleX, FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ambilProyek } from "@/lib/data/proyek";
import { daftarBerkasLkps, lkpsAktif } from "@/lib/data/lkps";
import { nilaiButirProyek } from "@/lib/data/nilai-butir";
import { formatAngka } from "@/lib/domain/teks";
import { formatTahunAkademik } from "@/lib/domain/tahun-akademik";
import { fmtWaktu, formatMetrik, formatUkuran } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { STATUS_BERJALAN } from "@/lib/tampil";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiBerkasLkps } from "./aksi-berkas";

export const metadata: Metadata = { title: "Data LKPS" };

export default async function HalamanLkps({ params }: PageProps<"/proyek/[proyekId]/lkps">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const [proyek, berkas, aktif, nilai] = await Promise.all([
    ambilProyek(p, proyekId), daftarBerkasLkps(p, proyekId), lkpsAktif(p, proyekId), nilaiButirProyek(p, proyekId),
  ]);
  // revisi 19 Okt 2026: butir angka dihitung lewat rumus yang dipetakan di instrumen (kodeRumus) atau nilai manual PJ
  const metrik = nilai.daftar;
  const masalah = aktif?.berkas.masalah ?? [];
  const galat = masalah.filter((m) => m.tingkat === "galat");
  const peringatan = masalah.filter((m) => m.tingkat === "peringatan");
  const berjalan = berkas.some((b) => STATUS_BERJALAN.includes(b.status));
  const perluDicek = aktif?.tabel.filter((t) => t.perluDicek) ?? [];

  return (
    <>
      <PemantauProses aktif={berjalan} />
      <JudulHalaman
        judul="Data LKPS"
        deskripsi={`TS ${formatTahunAkademik(proyek.tsTahunMulai)}`}
        remah={[{ label: "Beranda LED", href: `/proyek/${proyekId}` }, { label: "Data LKPS" }]}
        aksi={!proyek.diarsipkanPada && (
          <Button asChild size="lg"><Link href={`/proyek/${proyekId}/lkps/tambah`}><Plus aria-hidden />Tambah data LKPS</Link></Button>
        )}
      />
      <Petunjuk
        kunci="proyek-lkps"
        fungsi="LKPS adalah sumber data angka. Sistem membaca tabel LKPS dan menghitung metrik butir angka; narasi hanya boleh memakai angka dari sini."
        langkah={[
          "Unggah berkas LKPS (Excel dari template LAM Teknik).",
          "Periksa tabel hasil bacaan dan peringatan; koreksi sel yang salah.",
          "Periksa metrik butir angka, lalu lanjut ke halaman kriteria.",
        ]}
      />

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Berkas LKPS</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {berkas.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">Belum ada berkas LKPS. Klik <span className="font-medium text-foreground">Tambah data LKPS</span>.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Berkas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tabel</TableHead>
                    <TableHead>Diunggah</TableHead>
                    <TableHead className="w-12 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {berkas.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-72 pl-6">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="truncate font-medium">{b.namaBerkas}</span>
                          {b.aktif && <Badge>Sumber data</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{b.jenis.toUpperCase()} · {formatUkuran(b.ukuran)}</div>
                        {b.pesan && <div className="text-xs text-destructive">{b.pesan}</div>}
                      </TableCell>
                      <TableCell><LencanaProses status={b.status} /></TableCell>
                      <TableCell className="text-right tabular-nums">{b._count.tabel}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtWaktu.format(b.createdAt)}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <AksiBerkasLkps proyekId={proyekId} id={b.id} nama={b.namaBerkas} bisaAktif={b.status === "dibaca" && !b.aktif} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {berjalan && (
              <p className="px-6 pt-3 text-xs text-muted-foreground">
                Berkas sedang dibaca di latar. Halaman ini diperbarui otomatis; pastikan worker berjalan (<code>npm run worker</code>).
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {aktif && (
        <>
          {galat.length > 0 && (
            <Alert variant="destructive">
              <CircleX aria-hidden />
              <AlertTitle>Masalah struktur ({galat.length})</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">{galat.map((m, i) => <li key={i}>{m.pesan}</li>)}</ul>
              </AlertDescription>
            </Alert>
          )}
          {perluDicek.length > 0 && (
            <Alert>
              <AlertTriangle aria-hidden />
              <AlertTitle>{perluDicek.length} tabel hasil PDF perlu dicek</AlertTitle>
              <AlertDescription>
                Angka dari PDF bisa bergeser kolom. Buka tiap tabel, bandingkan dengan LKPS asli, koreksi bila perlu, lalu tandai sudah dicek.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metrik butir angka (dihitung sistem)</CardTitle>
              <CardDescription>
                Rumus dari Matriks Penilaian LED dan LKPS Sarjana 2025. Angka ini yang dipakai narasi; LLM tidak menghitung.
                Skor perkiraan hanya bantuan, bukan penilaian asesor.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Butir</TableHead>
                    <TableHead>Metrik utama</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                    <TableHead className="text-right">Skor perkiraan</TableHead>
                    <TableHead>Tabel</TableHead>
                    <TableHead className="pr-6">Rincian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrik.map((d) => {
                    const h = d.hasil;
                    if (!h || d.sumber === "manual") {
                      return (
                        <TableRow key={d.butir} className="align-top">
                          <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{d.butir}</TableCell>
                          <TableCell className="max-w-64 whitespace-normal text-sm text-muted-foreground">{d.kodeRumus ? "Rumus tidak bisa membaca LKPS" : "Tanpa rumus sistem"}</TableCell>
                          <TableCell className="text-right font-medium">{d.manual ? d.manual.nilai : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="font-mono text-xs">{h?.tabel.join(", ")}</TableCell>
                          <TableCell className="max-w-72 whitespace-normal pr-6 text-xs text-muted-foreground">
                            {d.manual ? `Nilai manual penyusun${d.manual.keterangan ? `: ${d.manual.keterangan}` : ""}` : d.alasan}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const u = h.metrik.find((x) => x.kode === h.utama);
                    return (
                      <TableRow key={h.butir} className="align-top">
                        <TableCell className="pl-6">
                          <div className="font-mono text-xs text-muted-foreground">{h.butir}</div>
                          <div className="max-w-56 whitespace-normal text-sm">{h.judul}</div>
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal text-sm">{u?.nama}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{u ? formatMetrik(u) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{h.skor === null ? <span className="text-muted-foreground">—</span> : formatAngka(h.skor, 2)}</TableCell>
                        <TableCell className="font-mono text-xs">{h.tabel.join(", ")}</TableCell>
                        <TableCell className="pr-6">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-primary">{h.metrik.length} metrik</summary>
                            <dl className="mt-2 grid max-w-md gap-1">
                              {h.metrik.map((x) => (
                                <div key={x.kode} className="flex justify-between gap-3">
                                  <dt className="text-muted-foreground"><span className="font-mono">{x.kode}</span> {x.nama}</dt>
                                  <dd className="shrink-0 tabular-nums">{formatMetrik(x)}</dd>
                                </div>
                              ))}
                            </dl>
                            {h.metrik.filter((x) => x.rumus).map((x) => <p key={x.kode} className="mt-1 font-mono text-[11px] text-muted-foreground">{x.rumus}</p>)}
                            {h.catatan.map((c, i) => <p key={i} className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{c}</p>)}
                          </details>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabel LKPS ({aktif.tabel.length})</CardTitle>
              <CardDescription>
                Sumber: {aktif.berkas.namaBerkas}. {peringatan.length > 0 ? `${peringatan.length} peringatan isian.` : "Tidak ada sel wajib yang kosong."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {aktif.tabel.map((t) => {
                  const n = peringatan.filter((m) => m.sheet === t.sheet).length;
                  return (
                    <li key={t.id}>
                      <Link href={`/proyek/${proyekId}/lkps/${t.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted">
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-muted-foreground">Sheet {t.sheet} · {t.baris.length} baris</div>
                          <div className="truncate">{t.judul}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {t.perluDicek && <Badge variant="secondary">perlu dicek</Badge>}
                            {t.dikoreksi && <Badge variant="outline">dikoreksi</Badge>}
                            {n > 0 && <Badge variant="outline" className="text-amber-700 dark:text-amber-300">{n} peringatan</Badge>}
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
