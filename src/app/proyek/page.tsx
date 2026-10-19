import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarProyek, instrumenAktifUntuk } from "@/lib/data/proyek";
import { daftarProdi } from "@/lib/data/organisasi";
import { namaJenjang } from "@/lib/domain/instrumen";
import { formatTahunAkademik, labelPeriode } from "@/lib/domain/tahun-akademik";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormProyekBaru, type PilihanProdiLed } from "./form-proyek-baru";

export const metadata: Metadata = { title: "Semua LED" };

export default async function HalamanDaftarProyek() {
  const p = await wajibPenanggungJawab();
  const [proyek, prodi] = await Promise.all([daftarProyek(p), daftarProdi(p)]);
  const tahunIni = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()));

  // pilihan prodi untuk LED baru: nonaktif bila masih ada LED aktif atau instrumen jenjangnya belum aktif
  const instrumen = new Map<string, boolean>();
  for (const j of new Set(prodi.map((x) => x.jenjang))) instrumen.set(j, Boolean(await instrumenAktifUntuk(j)));
  const pilihan: PilihanProdiLed[] = prodi.map((x) => ({
    id: x.id,
    nama: x.nama,
    jenjang: x.jenjang,
    alasan: x.proyek.some((l) => !l.diarsipkanPada)
      ? "masih ada LED aktif"
      : !instrumen.get(x.jenjang) ? `instrumen ${namaJenjang(x.jenjang)} belum aktif` : null,
  }));

  const perProdi = prodi
    .map((x) => ({ prodi: x, led: proyek.filter((l) => l.prodiId === x.id) }))
    .filter((g) => g.led.length > 0);

  return (
    <ShellDaftarProyek pengguna={p}>
      <JudulHalaman
        judul="Semua LED"
        deskripsi="Satu LED adalah satu pengajuan akreditasi satu program studi yang berlaku 5 tahun."
      />
      <Petunjuk
        kunci="pj-semua-led"
        fungsi="Semua LED fakultas, dikelompokkan per program studi. Setiap prodi hanya punya satu LED aktif; LED periode lama diarsipkan dan tetap bisa dibuka sebagai rujukan."
        langkah={[
          "Pastikan program studi sudah terdaftar (menu Program studi) dan instrumen jenjangnya aktif (menu Instrumen).",
          "Tambahkan kunci API Gemini di menu Kunci API fakultas bila belum ada.",
          "Buat LED baru: pilih prodi, tahun pengajuan, dan nama LED.",
          "Buka LED untuk mengunggah LKPS dan dokumen, lalu menyusun narasi per kriteria.",
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-6 xl:col-span-3">
          {perProdi.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Belum ada LED. Buat LED pertama di formulir sebelah.
              </CardContent>
            </Card>
          ) : (
            perProdi.map((g) => (
              <section key={g.prodi.id} className="flex flex-col gap-3" aria-label={g.prodi.nama}>
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {g.prodi.nama} <span className="font-normal">({namaJenjang(g.prodi.jenjang)})</span>
                </h2>
                {g.led.map((x) => (
                  <Link key={x.id} href={`/proyek/${x.id}`} className="group">
                    <Card className={`transition-colors group-hover:border-primary/40 ${x.diarsipkanPada ? "opacity-75" : ""}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-2">
                          {x.nama}
                          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{labelPeriode(x.tahunPengajuan)}</Badge>
                          {x.diarsipkanPada ? <Badge variant="outline">Diarsipkan</Badge> : <Badge>Aktif</Badge>}
                          <span>Data LKPS TS {formatTahunAkademik(x.tsTahunMulai)} · {x.versi.nama}</span>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </section>
            ))
          )}
        </div>
        <Card className="h-fit xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">LED baru</CardTitle>
            <CardDescription>Jenjang diambil dari data prodi dan instrumennya otomatis instrumen aktif jenjang itu.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormProyekBaru prodi={pilihan} tahunUsulan={tahunIni} />
          </CardContent>
        </Card>
      </div>
    </ShellDaftarProyek>
  );
}
