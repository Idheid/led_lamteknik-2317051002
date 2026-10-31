import type { Pengguna } from "@/modules/bersama/akses";
import Link from "next/link";
import { ringkasanPemakaian } from "@/modules/bersama/data/pemakaian";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { fmtWaktu } from "@/modules/bersama/tampil";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PILIHAN_HARI = [1, 7, 30];

/** Log pemakaian per kunci dan model (revisi 19 Okt 2026: bagian dari halaman Kunci API admin). */
export async function BagianLog({ p, hariMasukan }: { p: Pengguna; hariMasukan?: string }) {
  const hari = PILIHAN_HARI.includes(Number(hariMasukan)) ? Number(hariMasukan) : 7;
  const r = await ringkasanPemakaian(p, { hari });
  const kartu = [
    { judul: "Panggilan berhasil", nilai: r.total.berhasil },
    { judul: "Panggilan gagal", nilai: r.total.gagal },
    { judul: "Token masuk", nilai: r.total.tokenMasuk },
    { judul: "Token keluar", nilai: r.total.tokenKeluar },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Pemakaian</h2>
        <div className="flex gap-1">
          {PILIHAN_HARI.map((h) => (
            <Button key={h} asChild size="sm" variant={h === hari ? "secondary" : "ghost"}>
              <Link href={`/admin/kunci-api?tab=pemakaian&hari=${h}`}>{h === 1 ? "24 jam" : `${h} hari`}</Link>
            </Button>
          ))}
        </div>
      </div>
      <Petunjuk
        kunci="admin-kunci-log"
        fungsi="Memantau pemakaian kuota Gemini oleh semua LED. Galat 429 berarti kuota kunci habis; sistem otomatis mencoba model cadangan dan kunci berikutnya."
        langkah={[
          "Periksa panggilan gagal: kuota_harian berarti kunci perlu diganti atau ditunggu sampai reset (14.00–15.00 WIB).",
          "Bila kuota sering habis, tambahkan kunci cadangan di tab Kunci cadangan.",
          "Bandingkan token per model untuk memilih model narasi yang hemat di tab Model Gemini.",
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((k) => (
          <Card key={k.judul}>
            <CardHeader>
              <CardDescription>{k.judul}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatAngka(k.nilai, 0)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per model</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Model</TableHead>
                  <TableHead className="text-right">Berhasil</TableHead>
                  <TableHead className="text-right">Gagal</TableHead>
                  <TableHead className="pr-6 text-right">Token masuk / keluar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.perModel.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="pl-6 text-muted-foreground">Belum ada panggilan.</TableCell></TableRow>
                )}
                {r.perModel.map((m) => (
                  <TableRow key={m.model}>
                    <TableCell className="pl-6 font-mono text-xs">{m.model}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAngka(m.berhasil, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAngka(m.gagal, 0)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatAngka(m.tokenMasuk, 0)} / {formatAngka(m.tokenKeluar, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per program studi</CardTitle>
            <CardDescription>Hanya panggilan yang berhasil.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Prodi</TableHead>
                  <TableHead className="text-right">Panggilan</TableHead>
                  <TableHead className="pr-6 text-right">Token masuk / keluar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.perProdi.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="pl-6 text-muted-foreground">Belum ada panggilan.</TableCell></TableRow>
                )}
                {r.perProdi.map((x) => (
                  <TableRow key={x.prodi}>
                    <TableCell className="pl-6">{x.prodi}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAngka(x.panggilan, 0)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatAngka(x.tokenMasuk, 0)} / {formatAngka(x.tokenKeluar, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">100 panggilan terakhir</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Waktu</TableHead>
                <TableHead>Prodi / proyek</TableHead>
                <TableHead>Sub-bagian</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Kunci</TableHead>
                <TableHead className="text-right">Token</TableHead>
                <TableHead className="text-right">Durasi</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.terbaru.length === 0 && (
                <TableRow><TableCell colSpan={8} className="pl-6 text-muted-foreground">Belum ada panggilan.</TableCell></TableRow>
              )}
              {r.terbaru.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="pl-6 whitespace-nowrap text-xs">{fmtWaktu.format(l.waktu)}</TableCell>
                  <TableCell className="text-xs">{l.prodi}<span className="block text-muted-foreground">{l.proyek}</span></TableCell>
                  <TableCell className="font-mono text-xs">{l.subBagian ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.model}</TableCell>
                  <TableCell className="text-xs">{l.kunci}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatAngka(l.tokenMasuk, 0)} / {formatAngka(l.tokenKeluar, 0)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{l.durasiMs ? `${formatAngka(l.durasiMs / 1000, 1)} dtk` : "—"}</TableCell>
                  <TableCell className="pr-6 text-xs">
                    {l.berhasil
                      ? <Badge variant="secondary">Berhasil</Badge>
                      : <span className="block max-w-64"><Badge variant="outline" className="text-destructive">Gagal</Badge> <span className="line-clamp-2 text-muted-foreground" title={l.galat ?? ""}>{l.galat}</span></span>}
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
