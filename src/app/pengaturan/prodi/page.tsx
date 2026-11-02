import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Pencil, Plus } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilFakultas, daftarProdi } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { labelTsPengajuan } from "@/modules/bersama/domain/tahun-akademik";
import { sisaBulan } from "@/modules/led/domain/kesiapan";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
import { RingkasKesiapan } from "@/modules/led/komponen/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TombolHapusProdi } from "./tombol-hapus";

export const metadata: Metadata = { title: "Program studi" };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" });

export default async function HalamanProdi() {
  const p = await wajibAdmin();
  const [fakultas, prodi] = await Promise.all([ambilFakultas(), daftarProdi(p)]);
  const hariIni = new Date();
  const kesiapan = await kesiapanSemua(p, prodi.flatMap((x) => x.proyek.filter((l) => !l.diarsipkanPada).map((l) => l.id)));
  return (
    <>
      <JudulHalaman
        judul="Program studi"
        aksi={<Button asChild><Link href="/pengaturan/prodi/baru"><Plus aria-hidden />Tambah prodi</Link></Button>}
      />
      <Petunjuk
        kunci="pj-prodi"
        fungsi="Daftar prodi diurutkan menurut tanggal akreditasi berakhir, jadi prodi yang harus menyusun LED berikutnya tampil paling atas."
        langkah={[
          "Tambahkan program studi beserta jenjang, kode PDDikti, tanggal akreditasi berakhir, dan identitas pengusulnya.",
          "Pastikan instrumen jenjang prodi aktif (menu Instrumen) dan buat akun Tim Prodi (Kelola akun); Tim Prodi membuat LED prodinya.",
          "Perguruan tinggi, UPPS, alamat, dan SK pendirian PT diatur sekali di menu Identitas institusi.",
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <Landmark className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="text-muted-foreground">Institusi:</span>
          <span className="font-medium">{[fakultas?.nama, fakultas?.perguruanTinggi, fakultas?.kota].filter(Boolean).join(" · ") || "Belum diisi"}</span>
        </span>
        <Button asChild size="sm" variant="outline"><Link href="/pengaturan/institusi"><Pencil aria-hidden />Identitas institusi</Link></Button>
      </div>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          {prodi.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Belum ada program studi.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Program studi</TableHead>
                  <TableHead>Jenjang</TableHead>
                  <TableHead>Kode PDDikti</TableHead>
                  <TableHead>Akreditasi berlaku sampai</TableHead>
                  <TableHead>LED</TableHead>
                  <TableHead>Kesiapan</TableHead>
                  <TableHead className="w-20 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {prodi.map((x) => {
                  const aktif = x.proyek.find((l) => !l.diarsipkanPada);
                  const sisa = sisaBulan(x.akreditasiBerlakuSampai, hariIni);
                  const k = aktif ? kesiapan.get(aktif.id) : undefined;
                  return (
                    <TableRow key={x.id}>
                      <TableCell className="pl-4 font-medium">{x.nama}</TableCell>
                      <TableCell>{namaJenjang(x.jenjang)}</TableCell>
                      <TableCell className="font-mono text-xs">{x.kodePddikti ?? "—"}</TableCell>
                      <TableCell>
                        {x.akreditasiBerlakuSampai ? (
                          <span className="flex flex-wrap items-center gap-2">
                            {fmtTanggal.format(x.akreditasiBerlakuSampai)}
                            {sisa !== null && sisa < 0 && <Badge variant="destructive">sudah berakhir</Badge>}
                            {sisa !== null && sisa >= 0 && sisa <= 24 && <Badge variant="outline">{sisa} bulan lagi</Badge>}
                          </span>
                        ) : <span className="text-muted-foreground">belum diisi</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {aktif
                          ? <Link className="text-primary hover:underline" href={`/led/asesor/${aktif.id}`}>{aktif.nama} · {labelTsPengajuan(aktif.tsTahunMulai, aktif.tahunPengajuan)}</Link>
                          : <span className="text-muted-foreground">Tidak ada LED aktif{x.proyek.length ? ` (${x.proyek.length} arsip)` : ""}</span>}
                        {/* revisi 31 Okt 2026: LED dibuat Tim Prodi; admin hanya melihat berapa akun Tim Prodi prodi ini */}
                        <span className={`block ${x._count.anggota ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`}>
                          {x._count.anggota ? `${x._count.anggota} akun Tim Prodi` : "Belum ada akun Tim Prodi"}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-56 whitespace-normal">
                        {k ? <RingkasKesiapan k={k} ringkas /> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Ubah ${x.nama}`}>
                          <Link href={`/pengaturan/prodi/${x.id}`}><Pencil /></Link>
                        </Button>
                        <TombolHapusProdi id={x.id} nama={x.nama} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
