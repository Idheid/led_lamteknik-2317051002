import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarProyek } from "@/lib/data/proyek";
import { daftarProdi } from "@/lib/data/organisasi";
import { kesiapanSemua } from "@/lib/data/kesiapan";
import { KartuLed } from "@/components/kesiapan";
import { namaJenjang } from "@/lib/domain/instrumen";
import { labelPeriode } from "@/lib/domain/tahun-akademik";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Semua LED" };

/**
 * Semua LED fakultas (revisi 23 Okt 2026): LED aktif sebagai kartu besar, diurutkan menurut tanggal akreditasi prodi
 * berakhir; LED dengan jadwal terlewat berwarna merah. LED baru dibuat di halaman sendiri (/proyek/baru).
 */
export default async function HalamanDaftarProyek() {
  const p = await wajibPenanggungJawab();
  const [proyek, prodi] = await Promise.all([daftarProyek(p), daftarProdi(p)]);
  const kesiapan = await kesiapanSemua(p, proyek.filter((x) => !x.diarsipkanPada).map((x) => x.id));

  // daftar prodi sudah terurut menurut akreditasi berakhir (terdekat di atas); LED arsip dikumpulkan di bawah
  const aktif = prodi.flatMap((x) => proyek.filter((l) => l.prodiId === x.id && !l.diarsipkanPada).map((l) => ({ prodi: x, led: l })));
  const arsip = prodi.flatMap((x) => proyek.filter((l) => l.prodiId === x.id && l.diarsipkanPada).map((l) => ({ prodi: x, led: l })));

  return (
    <ShellDaftarProyek pengguna={p}>
      <JudulHalaman
        judul="Semua LED"
        aksi={<Button asChild size="lg"><Link href="/proyek/baru"><Plus aria-hidden />Buat LED baru</Link></Button>}
      />
      <Petunjuk
        kunci="pj-semua-led"
        fungsi="Semua LED fakultas. Prodi yang akreditasinya paling dekat berakhir tampil paling atas. Kartu merah berarti ada jadwal yang terlewat."
        langkah={[
          "Pastikan program studi sudah terdaftar (menu Program studi) dan instrumen jenjangnya aktif (menu Instrumen).",
          "Klik Buat LED baru: pilih prodi, tahun pengajuan, dan nama LED.",
          "Klik kartu LED untuk membukanya, lalu unggah LKPS dan dokumen dan susun narasi per kriteria.",
        ]}
      />
      {aktif.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-10 text-center">
          <p className="text-muted-foreground">Belum ada LED.</p>
          <Button asChild size="lg" className="mt-4"><Link href="/proyek/baru"><Plus aria-hidden />Buat LED pertama</Link></Button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {aktif.map(({ prodi: pr, led: x }) => (
            <KartuLed
              key={x.id}
              href={`/proyek/${x.id}`}
              nama={x.nama}
              prodi={`${pr.nama} (${namaJenjang(pr.jenjang)})`}
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
            {arsip.map(({ prodi: pr, led: x }) => (
              <li key={x.id}>
                <Link href={`/proyek/${x.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted/60">
                  <span>{x.nama} <span className="text-muted-foreground">· {pr.nama}</span></span>
                  <span className="flex items-center gap-2"><Badge variant="secondary">{labelPeriode(x.tahunPengajuan)}</Badge><Badge variant="outline">Diarsipkan</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ShellDaftarProyek>
  );
}
