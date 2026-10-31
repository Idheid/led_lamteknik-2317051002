import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { daftarProdi } from "@/modules/bersama/data/organisasi";
import { daftarProyek } from "@/modules/led/data/proyek";
import { daftarPenugasan } from "@/modules/led/data/review";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
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
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {led
                        ? (
                          <>
                            <div>{led.nama}</div>
                            <div className="text-xs text-muted-foreground">{labelTsPengajuan(led.tsTahunMulai, led.tahunPengajuan)}</div>
                            <Button asChild size="sm" variant="outline" className="mt-2">
                              <Link href={`/led/asesor/${led.id}`}><Eye aria-hidden />Lihat</Link>
                            </Button>
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
