import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { daftarProyek } from "@/modules/led/data/proyek";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import { kesiapanSemua } from "@/modules/led/data/kesiapan";
import { KartuLed } from "@/modules/led/komponen/kesiapan";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { labelPeriode } from "@/modules/bersama/domain/tahun-akademik";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "LED prodi" };

/**
 * LED prodi Tim Prodi (revisi 31 Okt 2026): LED aktif sebagai kartu besar dan LED arsip di bawahnya. Bila belum ada LED
 * aktif, tombol besar "Buat LED". Semua akun Tim Prodi satu prodi melihat LED yang sama.
 */
export default async function HalamanLedProdi() {
  const p = await wajibTimProdi();
  const [proyek, prodi] = await Promise.all([daftarProyek(p), ambilProdi(p, p.prodiId)]);
  const aktif = proyek.filter((x) => !x.diarsipkanPada);
  const arsip = proyek.filter((x) => x.diarsipkanPada);
  const kesiapan = await kesiapanSemua(p, aktif.map((x) => x.id));
  const namaProdi = prodi ? `${namaJenjang(prodi.jenjang)} ${prodi.nama}` : "Program studi";

  return (
    <ShellMenuLed pengguna={p}>
      <JudulHalaman judul="LED prodi" deskripsi={namaProdi} />
      <Petunjuk
        kunci="tim-led-prodi"
        fungsi="LED program studi Anda. Satu LED = satu pengajuan akreditasi (berlaku 5 tahun). Semua akun Tim Prodi prodi ini menyusun LED yang sama."
        langkah={[
          "Klik Buat LED: isi tahun pengajuan dan nama LED. Instrumen dipilih otomatis menurut jenjang prodi.",
          "Buka kartu LED, unggah LKPS dan dokumen, lalu susun narasi per kriteria.",
          "Bila kuota kunci API habis atau instrumen belum aktif, hubungi Admin UPPS.",
        ]}
      />
      {aktif.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center">
          <p className="text-muted-foreground">{namaProdi} belum punya LED aktif.</p>
          <Button asChild size="lg" className="mt-4 h-12 px-8 text-base"><Link href="/led/baru"><Plus aria-hidden />Buat LED</Link></Button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {aktif.map((x) => (
            <KartuLed
              key={x.id}
              href={`/led/${x.id}`}
              nama={x.nama}
              prodi={namaProdi}
              periode={labelPeriode(x.tahunPengajuan)}
              k={kesiapan.get(x.id) ?? null}
            />
          ))}
        </div>
      )}
      {arsip.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="LED diarsipkan">
          <h2 className="text-sm font-semibold text-muted-foreground">LED diarsipkan</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {arsip.map((x) => (
              <li key={x.id}>
                <Link href={`/led/${x.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted/60">
                  <span>{x.nama}</span>
                  <span className="flex items-center gap-2"><Badge variant="secondary">{labelPeriode(x.tahunPengajuan)}</Badge><Badge variant="outline">Diarsipkan</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ShellMenuLed>
  );
}
