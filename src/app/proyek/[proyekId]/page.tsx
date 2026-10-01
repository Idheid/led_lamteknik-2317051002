import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, KeyRound } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { bagianProyek, butirAnggaranProyek, ringkasanBagianProyek } from "@/lib/data/proyek";
import { bacaAnggaran } from "@/lib/domain/anggaran-proyek";
import { hitungAnggaran, usulanHalamanKriteria } from "@/lib/domain/anggaran";
import { namaJenjang } from "@/lib/domain/instrumen";
import { formatAngka } from "@/lib/domain/teks";
import { formatTahunAkademik } from "@/lib/domain/tahun-akademik";
import type { IdentitasProdi } from "@/lib/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { PetaTS } from "@/components/peta-ts";
import { LencanaStatus } from "@/components/lencana-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogUbahTs } from "./dialog-ubah-ts";

export const metadata: Metadata = { title: "Beranda" };

const LABEL_JENIS: Record<string, string> = {
  awal: "Halaman awal", bab: "Bab", butir: "Bab berbutir", kriteria: "Kriteria", cadangan: "Cadangan", lampiran: "Lampiran",
};

export default async function Beranda({ params }: PageProps<"/proyek/[proyekId]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const [{ proyek, bagian }, { butir }, ringkas] = await Promise.all([
    bagianProyek(p, proyekId),
    butirAnggaranProyek(p, proyekId),
    ringkasanBagianProyek(p, proyekId),
  ]);
  const { pengaturan, bagian: bagianAnggaran } = bacaAnggaran(proyek.anggaran);
  const anggaran = hitungAnggaran(bagianAnggaran, butir, pengaturan);
  const usulan = usulanHalamanKriteria(bagianAnggaran, butir, pengaturan);
  const petaAnggaran = new Map(anggaran.bagian.map((b) => [b.kode, b]));
  const namaBagian = new Map(bagian.map((b) => [b.kode, b.nama]));
  // JSONB tidak menjaga urutan kunci: urutkan menurut urutan bagian di versi, bagian tak dikenal (cadangan) di akhir
  const urutanBagian = new Map(bagian.map((b, i) => [b.kode, i]));
  const barisAnggaran = [...anggaran.bagian].sort(
    (a, b) => (urutanBagian.get(a.kode) ?? Infinity) - (urutanBagian.get(b.kode) ?? Infinity),
  );

  const kriteria = bagian.filter((b) => b.jenis === "kriteria");
  const lain = bagian.filter((b) => b.jenis !== "kriteria" && b.jenis !== "lampiran");
  const semua = [...kriteria, ...lain];
  const selesai = semua.filter((b) => b.status === "selesai").length;
  const kriteriaSelesai = kriteria.filter((b) => b.status === "selesai").length;
  const ident = (proyek.prodi.identitas ?? {}) as Partial<IdentitasProdi>;

  return (
    <>
      <JudulHalaman
        judul={proyek.nama}
        deskripsi={`${proyek.prodi.nama} · ${namaJenjang(proyek.jenjang)} · ${proyek.prodi.upps.nama}, ${proyek.prodi.upps.perguruanTinggi}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Kriteria selesai</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {kriteriaSelesai}<span className="text-lg text-muted-foreground"> / {kriteria.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={(kriteriaSelesai / Math.max(kriteria.length, 1)) * 100} aria-label="Progres kriteria" />
            <p className="text-xs text-muted-foreground">Seluruh bagian: {selesai} dari {semua.length} selesai</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Anggaran halaman</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {anggaran.totalHalaman}<span className="text-lg text-muted-foreground"> / {pengaturan.batasHalamanTotal}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={(anggaran.totalHalaman / pengaturan.batasHalamanTotal) * 100} aria-label="Anggaran halaman" />
            <p className="text-xs text-muted-foreground">
              {anggaran.melebihiBatas ? "Melebihi batas! Kurangi halaman." : `Termasuk cover dan kata pengantar · ${anggaran.halamanUntukKriteria} hlm untuk C.1–C.7`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tahun TS</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{formatTahunAkademik(proyek.tsTahunMulai)}</CardTitle>
            <CardAction>
              <DialogUbahTs proyekId={proyek.id} tsTahunMulai={proyek.tsTahunMulai} />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              TS-1 = {formatTahunAkademik(proyek.tsTahunMulai - 1)}, TS-2 = {formatTahunAkademik(proyek.tsTahunMulai - 2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Kunci API Gemini</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-muted-foreground" aria-hidden />
              Belum diatur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Diisi sebelum generate (iterasi berikutnya).</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progres dan anggaran kriteria</CardTitle>
          <CardDescription>
            Halaman per kriteria dibagi menurut bobot butir (butir angka setengah porsi), minimum {pengaturan.halamanMinimumKriteria} halaman;
            35% untuk latar belakang, kebijakan, analisis faktor, dan SWOT.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Kriteria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sub-bagian</TableHead>
                <TableHead className="text-right">Butir</TableHead>
                <TableHead className="text-right">Bobot</TableHead>
                <TableHead className="text-right">Halaman</TableHead>
                <TableHead className="text-right">Usulan sistem</TableHead>
                <TableHead className="text-right">Target kata</TableHead>
                <TableHead className="w-8 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kriteria.map((b) => {
                const a = petaAnggaran.get(b.kode);
                const bt = ringkas.jumlahButir.get(b.kode);
                return (
                  <TableRow key={b.kode}>
                    <TableCell className="pl-6">
                      <Link href={`/proyek/${proyek.id}/bagian/${b.kode}`} className="font-medium hover:underline">
                        <span className="mr-2 font-mono text-xs text-muted-foreground">{b.kode}</span>
                        {b.nama}
                      </Link>
                    </TableCell>
                    <TableCell><LencanaStatus status={b.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{ringkas.jumlahSub.get(b.kode) ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{bt?.jumlah ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAngka(bt?.bobot ?? 0)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{a?.halaman ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {usulan[b.kode] !== undefined ? formatAngka(usulan[b.kode], 1) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a ? formatAngka(a.kataTotal, 0) : "—"}</TableCell>
                    <TableCell className="pr-6">
                      <Link href={`/proyek/${proyek.id}/bagian/${b.kode}`} aria-label={`Buka ${b.kode}`}>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6" colSpan={4}>Total kriteria</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAngka(kriteria.reduce((s, b) => s + (ringkas.jumlahButir.get(b.kode)?.bobot ?? 0), 0))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {kriteria.reduce((s, b) => s + (petaAnggaran.get(b.kode)?.halaman ?? 0), 0)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anggaran seluruh LED</CardTitle>
            <CardDescription>{formatAngka(pengaturan.kataPerHalaman, 0)} kata per halaman untuk perencanaan.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Bagian</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Halaman</TableHead>
                  <TableHead className="pr-6 text-right">Kata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barisAnggaran.map((b) => (
                  <TableRow key={b.kode}>
                    <TableCell className="pl-6">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{b.kode}</span>
                      {b.kode === "CAD" ? "Cadangan (tabel, gambar, daftar isi)" : namaBagian.get(b.kode) ?? b.kode}
                    </TableCell>
                    <TableCell><Badge variant="outline">{LABEL_JENIS[b.jenis] ?? b.jenis}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{b.halaman}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatAngka(b.kataTotal, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-6" colSpan={2}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{anggaran.totalHalaman}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">
                    {formatAngka(anggaran.bagian.reduce((s, b) => s + b.kataTotal, 0), 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peta label TS</CardTitle>
              <CardDescription>Label TS di LKPS diganti tahun akademik nyata di narasi.</CardDescription>
            </CardHeader>
            <CardContent>
              <PetaTS tsTahunMulai={proyek.tsTahunMulai} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identitas pengusul</CardTitle>
              <CardDescription>Diisi super admin; dipakai di halaman identitas LED.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  ["Kode PDDikti", proyek.prodi.kodePddikti],
                  ["Akreditasi terakhir", ident.peringkatAkreditasi],
                  ["SK akreditasi", ident.nomorSkAkreditasi],
                  ["Berlaku sampai", ident.akreditasiBerlakuSampai],
                  ["SK pembukaan prodi", ident.skPembukaan],
                  ["Versi instrumen", proyek.versi.kode],
                ].map(([label, nilai]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd>{nilai || <span className="text-muted-foreground">belum diisi</span>}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
