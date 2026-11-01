import type { Metadata } from "next";
import Link from "next/link";
import { Award, Eye } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { daftarProdi } from "@/modules/bersama/data/organisasi";
import { daftarProyek } from "@/modules/led/data/proyek";
import { daftarPenugasan } from "@/modules/led/data/review";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
import { syaratCatatHasil } from "@/modules/led/data/akreditasi";
import { statusPeriodeProdi } from "@/modules/bersama/data/pengingat-akreditasi";
import { Badge } from "@/components/ui/badge";
import { TombolIngatkan } from "./tombol-ingatkan";
import { RingkasKesiapan } from "@/modules/led/komponen/kesiapan";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { labelTsPengajuan } from "@/modules/bersama/domain/tahun-akademik";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Pantau LED" };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });

/**
 * Pantau LED (revisi 31 Okt 2026): Admin UPPS melihat LED aktif semua prodi, diurutkan menurut akreditasi berakhir,
 * dengan kesiapan, jadwal, status review, dan asesor. "Lihat" membuka LED hanya baca (tanpa alat catatan dan skor).
 */
export default async function HalamanPantauLed() {
  const p = await wajibAdmin();
  const [prodi, proyek, { asesor }] = await Promise.all([daftarProdi(p), daftarProyek(p), daftarPenugasan(p)]);
  const aktif = proyek.filter((x) => !x.diarsipkanPada);
  const kesiapan = await kesiapanSemua(p, aktif.map((x) => x.id));
  // L1: LED Layak diajukan atau sudah diekspor final bisa dicatat hasil akreditasinya
  const bolehCatat = new Set<string>();
  for (const l of aktif) if ((await syaratCatatHasil(l)).boleh) bolehCatat.add(l.id);
  // L2: prodi yang akreditasinya berakhir ≤ 18 bulan lagi tanpa LED aktif periode berikutnya
  const periode = new Map((await statusPeriodeProdi()).map((s) => [s.prodiId, s]));
  const namaAsesor = new Map(asesor.map((a) => [a.id, a.name]));
  const baris = prodi.map((x) => ({ prodi: x, led: aktif.find((l) => l.prodiId === x.id) ?? null }));
  const jumlahLed = baris.filter((b) => b.led).length;

  return (
    <ShellMenuLed pengguna={p}>
      <JudulHalaman judul="Pantau LED" deskripsi={`${jumlahLed} LED aktif dari ${prodi.length} program studi`} />
      <Petunjuk
        kunci="admin-pantau-led"
        fungsi="Memantau LED semua program studi. Prodi yang akreditasinya paling dekat berakhir tampil paling atas. LED disusun Tim Prodi; Admin UPPS hanya membaca."
        langkah={[
          "Prodi tanpa LED: pastikan prodi punya akun Tim Prodi (Kelola akun) dan instrumen jenjangnya aktif (Instrumen).",
          "Tugaskan asesor di menu Penugasan asesor sebelum Tim Prodi mengajukan review.",
          "Klik Lihat untuk membaca narasi LED tanpa mengubahnya.",
        ]}
      />
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Program studi</TableHead>
                <TableHead>LED</TableHead>
                <TableHead>Kesiapan, jadwal, dan review</TableHead>
                <TableHead className="pr-4">Asesor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Belum ada program studi. Tambahkan di menu <Link className="text-primary underline" href="/pengaturan/prodi">Program studi</Link>.
                  </TableCell>
                </TableRow>
              )}
              {baris.map(({ prodi: x, led }) => {
                const k = led ? kesiapan.get(led.id) : undefined;
                return (
                  <TableRow key={x.id}>
                    <TableCell className="pl-4 align-top">
                      <div className="font-medium">{namaJenjang(x.jenjang)} {x.nama}</div>
                      <div className="text-xs text-muted-foreground">
                        {x.akreditasiBerlakuSampai ? `Akreditasi s.d. ${fmtTanggal.format(x.akreditasiBerlakuSampai)}` : "Akreditasi berakhir belum diisi"}
                      </div>
                      {periode.get(x.id)?.perluLedBaru && (
                        <div className="mt-2 flex flex-col items-start gap-2">
                          <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">Perlu LED baru</Badge>
                          {x._count.anggota > 0 && <TombolIngatkan prodiId={x.id} />}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {led
                        ? (
                          <>
                            <div>{led.nama}</div>
                            <div className="text-xs text-muted-foreground">{labelTsPengajuan(led.tsTahunMulai, led.tahunPengajuan)}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/led/asesor/${led.id}`}><Eye aria-hidden />Lihat</Link>
                              </Button>
                              {bolehCatat.has(led.id) && (
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/pengaturan/prodi/${x.id}/akreditasi?led=${led.id}`}><Award aria-hidden />Catat hasil akreditasi</Link>
                                </Button>
                              )}
                            </div>
                          </>
                        )
                        : <span className="text-muted-foreground">{x._count.anggota ? "Belum ada LED aktif" : "Belum ada akun Tim Prodi"}</span>}
                    </TableCell>
                    <TableCell className="min-w-56 whitespace-normal align-top">
                      {k ? <RingkasKesiapan k={k} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="pr-4 align-top text-sm">
                      {led ? (led.asesorId ? namaAsesor.get(led.asesorId) ?? "Asesor nonaktif" : <span className="text-muted-foreground">Belum ditugaskan</span>) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ShellMenuLed>
  );
}
