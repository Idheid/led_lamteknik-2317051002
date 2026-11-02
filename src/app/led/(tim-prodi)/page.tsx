import type { Metadata } from "next";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { daftarProyek, instrumenAktifUntuk } from "@/modules/led/data/proyek";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
import { KartuLed } from "@/modules/led/komponen/kesiapan";
import { usulanBatasPengajuan } from "@/modules/led/domain/kesiapan";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { labelTsPengajuan } from "@/modules/bersama/domain/tahun-akademik";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMulaiLed } from "./form-mulai-led";
import { CalendarClock } from "lucide-react";
import { bahanUntukSalin, infoPeriodeBerikutnya } from "@/modules/led/data/periode";
import { teksKonfirmasiPeriode } from "@/modules/led/domain/periode";

export const metadata: Metadata = { title: "LED prodi" };

/**
 * LED prodi Tim Prodi (revisi 31 Okt 2026): LED aktif sebagai kartu besar dan LED arsip di bawahnya. Bila belum ada LED
 * aktif, kartu "Mulai LED {prodi}" berisi tahun pengajuan dan TS saja (perbaikan 1 Nov 2026, P5; dulu halaman /led/baru).
 * Semua akun Tim Prodi satu prodi melihat LED yang sama.
 */
export default async function HalamanLedProdi({ searchParams }: PageProps<"/led">) {
  const p = await wajibTimProdi();
  // L4: kartu Mulai LED periode berikutnya (dari Pengaturan LED lewat ?periode=berikutnya)
  const { periode: mintaPeriode } = (await searchParams) as { periode?: string };
  const berikut = await infoPeriodeBerikutnya(p);
  const [proyek, prodi] = await Promise.all([daftarProyek(p), ambilProdi(p, p.prodiId)]);
  const aktif = proyek.filter((x) => !x.diarsipkanPada);
  const arsip = proyek.filter((x) => x.diarsipkanPada);
  const kesiapan = await kesiapanSemua(p, aktif.map((x) => x.id));
  const namaProdi = prodi ? `${namaJenjang(prodi.jenjang)} ${prodi.nama}` : "Program studi";
  const tahunIni = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()));
  // TS bawaan dihitung dari usulan batas pengajuan (6 bulan sebelum akreditasi berakhir), atau hari ini bila belum ada
  const tanggalAcuan = prodi?.akreditasiBerlakuSampai ? usulanBatasPengajuan(prodi.akreditasiBerlakuSampai) : new Date();
  // tahun usulan periode berikutnya: tahun berakhirnya akreditasi (pengajuan sebelum berakhir), atau tahun ini
  const tahunBerikut = prodi?.akreditasiBerlakuSampai ? Math.max(tahunIni, tanggalAcuan.getUTCFullYear()) : tahunIni;
  const bahanSalin = berikut ? await bahanUntukSalin(p, tahunBerikut) : null;
  const alasan = prodi && aktif.length === 0 && !(await instrumenAktifUntuk(prodi.jenjang))
    ? `Instrumen ${namaJenjang(prodi.jenjang)} belum aktif. Hubungi Admin UPPS.`
    : null;

  return (
    <ShellMenuLed pengguna={p}>
      <JudulHalaman judul="LED prodi" deskripsi={namaProdi} />
      <Petunjuk
        kunci="tim-led-prodi"
        fungsi="LED program studi Anda. Satu LED = satu pengajuan akreditasi (berlaku 5 tahun). Semua akun Tim Prodi prodi ini menyusun LED yang sama."
        langkah={[
          "Di kartu Mulai LED, isi tahun pengajuan dan pilih TS (tahun data LKPS), lalu klik Mulai LED. Nama LED dibuat otomatis dan bisa diubah di Pengaturan LED; instrumen dipilih otomatis menurut jenjang prodi.",
          "Buka kartu LED, unggah LKPS dan dokumen, lalu susun narasi per kriteria.",
          "Bila kuota kunci API habis atau instrumen belum aktif, hubungi Admin UPPS.",
        ]}
      />
      {aktif.length === 0 && prodi && !berikut ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Rocket className="size-5 text-primary" aria-hidden />Mulai LED {namaProdi}</CardTitle>
            <CardDescription>
              {alasan ?? "Satu LED = satu pengajuan akreditasi. Pilih TS sesuai data LKPS yang dipakai; instrumen dipilih otomatis menurut jenjang prodi."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormMulaiLed prodi={{ nama: prodi.nama, alasan }} tahunUsulan={tahunIni} tanggalAcuan={tanggalAcuan.toISOString()} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {aktif.map((x) => (
            <KartuLed
              key={x.id}
              href={`/led/${x.id}`}
              nama={x.nama}
              prodi={namaProdi}
              periode={labelTsPengajuan(x.tsTahunMulai, x.tahunPengajuan)}
              k={kesiapan.get(x.id) ?? null}
            />
          ))}
        </div>
      )}
      {berikut && prodi && (berikut.syarat.tampilDiMenu || mintaPeriode === "berikutnya") && (
        <Card id="periode-berikutnya" className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="size-5 text-primary" aria-hidden />Mulai LED periode berikutnya</CardTitle>
            <CardDescription>
              {berikut.syarat.tampilDiMenu ? berikut.syarat.alasan : `Perhatian: ${berikut.syarat.alasan}`}{" "}
              {berikut.versi ? `LED baru memakai instrumen ${berikut.versi.nama}.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormMulaiLed
              prodi={{ nama: prodi.nama, alasan: berikut.versi ? null : `Instrumen ${namaJenjang(prodi.jenjang)} belum aktif. Hubungi Admin UPPS.` }}
              tahunUsulan={tahunBerikut}
              tanggalAcuan={tanggalAcuan.toISOString()}
              berikutnya={{ konfirmasi: teksKonfirmasiPeriode(berikut.lama.nama, berikut.versi?.nama ?? "-", berikut.sudahDiarsipkan), bahan: bahanSalin! }}
            />
          </CardContent>
        </Card>
      )}
      {arsip.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="LED diarsipkan">
          <h2 className="text-sm font-semibold text-muted-foreground">LED diarsipkan</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {arsip.map((x) => (
              <li key={x.id}>
                <Link href={`/led/${x.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted/60">
                  <span>{x.nama}</span>
                  <span className="flex items-center gap-2"><Badge variant="secondary">{labelTsPengajuan(x.tsTahunMulai, x.tahunPengajuan)}</Badge><Badge variant="outline">{x.labelArsip ?? "Diarsipkan"}</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ShellMenuLed>
  );
}
