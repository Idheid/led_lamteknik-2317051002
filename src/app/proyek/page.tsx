import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarProyek, prodiSaya } from "@/lib/data/proyek";
import { daftarVersiAktif } from "@/lib/data/instrumen";
import { namaJenjang } from "@/lib/domain/instrumen";
import { formatTahunAkademik, tsDariTanggalPengajuan } from "@/lib/domain/tahun-akademik";
import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormProyekBaru } from "./form-proyek-baru";

export const metadata: Metadata = { title: "Proyek LED" };

export default async function HalamanDaftarProyek() {
  const p = await wajibPenanggungJawab();
  const [prodi, proyek, versi] = await Promise.all([prodiSaya(p), daftarProyek(p), daftarVersiAktif()]);
  const bulanMulai = Number(process.env.BULAN_MULAI_TA) || undefined;
  const tsUsulan = tsDariTanggalPengajuan(new Date(), bulanMulai);
  return (
    <ShellAplikasi
      pengguna={p}
      subjudul={prodi.nama}
      beranda="/proyek"
      grup={[{ label: "Proyek", item: [{ judul: "Semua proyek LED", href: "/proyek", ikon: "proyek", persis: true }] }]}
    >
      <JudulHalaman
        judul="Proyek LED"
        deskripsi={`${prodi.nama} (${namaJenjang(prodi.jenjang)}) · ${prodi.upps.nama}, ${prodi.upps.perguruanTinggi}`}
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-4 xl:col-span-3">
          {proyek.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Belum ada proyek LED. Buat proyek pertama di formulir sebelah.
              </CardContent>
            </Card>
          ) : (
            proyek.map((x) => (
              <Link key={x.id} href={`/proyek/${x.id}`} className="group">
                <Card className="transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      {x.nama}
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">TS {formatTahunAkademik(x.tsTahunMulai)}</Badge>
                      <span>{x.versi.nama}</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>
        <Card className="h-fit xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Proyek baru</CardTitle>
            <CardDescription>Jenjang mengikuti prodi ({namaJenjang(prodi.jenjang)}). Tahun TS diusulkan dari tanggal hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormProyekBaru
              versi={versi.map((v) => ({ id: v.id, label: v.nama }))}
              tsUsulan={tsUsulan}
              namaAwal={`LED ${prodi.nama} ${tsUsulan + 1}`}
            />
          </CardContent>
        </Card>
      </div>
    </ShellAplikasi>
  );
}
