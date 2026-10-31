import type { Metadata } from "next";
import Link from "next/link";
import { wajibPeran } from "@/modules/bersama/sesi";
import { bagianProyek } from "@/modules/led/data/proyek";
import { daftarCatatan, penilaianProyek, perbaikanMenunggu } from "@/modules/led/data/review";
import { KotakPerbaikan } from "@/modules/led/komponen/review/kotak-perbaikan";
import { LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { LABEL_CATATAN } from "@/modules/led/domain/review";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ringkasan review" };

const PENJELASAN = {
  draf: "Tim Prodi belum mengajukan review. Anda bisa membaca narasi; catatan dan skor bisa diberikan setelah Tim Prodi menekan Ajukan review.",
  direview: "Tim Prodi sudah mengajukan review. Beri catatan revisi pada narasi, lalu isi Penilaian akhir.",
  perlu_revisi: "Anda menyatakan Perlu revisi. Tim Prodi memperbaiki lalu mengajukan review lagi.",
  layak: "Anda menyatakan Layak diajukan. Tim Prodi sekarang bisa mengekspor Word final.",
};

/** Ringkasan review satu LED untuk asesor (revisi 22 Okt 2026); Admin UPPS membacanya tanpa alat review (31 Okt 2026). */
export default async function HalamanRingkasanAsesor({ params }: PageProps<"/led/asesor/[proyekId]">) {
  const p = await wajibPeran("ASESOR", "ADMIN");
  const admin = p.peran === "ADMIN";
  const { proyekId } = await params;
  const [{ proyek, bagian }, { catatan, review }, nilai, perbaikan] = await Promise.all([
    bagianProyek(p, proyekId), daftarCatatan(p, proyekId), penilaianProyek(p, proyekId), admin ? Promise.resolve([]) : perbaikanMenunggu(p, proyekId),
  ]);
  const hitung = (s: string) => catatan.filter((c) => c.status === s).length;
  const perBagian = bagian
    .filter((b) => b.jenis === "kriteria" || b.jenis === "bab" || b.jenis === "butir")
    .map((b) => ({ ...b, c: catatan.filter((c) => c.bagianKode === b.kode) }));
  return (
    <>
      <JudulHalaman
        judul={`${proyek.prodi.nama} (${proyek.jenjang})`}
        deskripsi={proyek.nama}
        aksi={<Badge variant={review === "direview" ? "default" : "outline"}>{LABEL_REVIEW[review]}</Badge>}
      />
      <p className="rounded-lg border-l-4 border-primary/40 bg-muted/50 p-3 text-sm">
        {admin ? "Tampilan hanya baca untuk Admin UPPS: narasi, catatan asesor, dan penilaian. LED disusun Tim Prodi dan dinilai asesor." : PENJELASAN[review]}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Catatan revisi</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="text-2xl font-semibold tabular-nums">{hitung("terbuka") + hitung("diperbaiki")}</div>
            <div className="text-muted-foreground">
              belum selesai · {hitung("terbuka")} terbuka, {hitung("diperbaiki")} menunggu Anda, {hitung("diterima")} diterima
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Skor butir</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="text-2xl font-semibold tabular-nums">{nilai.akhir.dinilai}/{nilai.akhir.jumlahButir}</div>
            <div className="text-muted-foreground">butir dinilai · nilai {formatAngka(nilai.akhir.total)} dari {formatAngka(nilai.akhir.maksimum, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Perkiraan status</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="text-lg font-semibold">{nilai.perkiraan?.status ?? "—"}</div>
            <div className="text-muted-foreground">
              simulasi internal, bukan keputusan LAM · <Link className="text-primary underline" href={`/led/asesor/${proyekId}/penilaian`}>Penilaian akhir</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <KotakPerbaikan daftar={perbaikan} />

      <section className="rounded-lg border">
        <ul className="divide-y text-sm">
          {perBagian.map((b) => (
            <li key={b.kode} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <Link href={`/led/asesor/${proyekId}/bagian/${encodeURIComponent(b.kode)}`} className="font-medium text-primary hover:underline">
                {b.jenis === "kriteria" && <span className="mr-2 font-mono">{b.kode}</span>}{b.nama}
              </Link>
              <span className="flex flex-wrap gap-1.5">
                {(["terbuka", "diperbaiki", "diterima"] as const).map((s) => {
                  const n = b.c.filter((c) => c.status === s).length;
                  return n ? <Badge key={s} variant="outline">{n} {LABEL_CATATAN[s].toLowerCase()}</Badge> : null;
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
