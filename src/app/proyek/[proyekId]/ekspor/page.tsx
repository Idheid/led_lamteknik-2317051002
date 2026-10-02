import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck, Download, Info, Loader2 } from "lucide-react";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarEkspor, periksaEkspor } from "@/lib/data/ekspor";
import { BATAS_HALAMAN } from "@/lib/domain/ekspor";
import { fmtWaktu, formatUkuran } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { PemantauProses } from "@/components/status-proses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TombolEkspor, TombolHapusEkspor } from "./komponen";

export const metadata: Metadata = { title: "Ekspor Word" };

const STATUS: Record<string, { label: string; kelas: string }> = {
  antre: { label: "Menunggu antrean", kelas: "bg-muted text-muted-foreground" },
  diproses: { label: "Diproses", kelas: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" },
  siap: { label: "Siap diunduh", kelas: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  ditahan: { label: `Ditahan (> ${BATAS_HALAMAN} halaman)`, kelas: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  gagal: { label: "Gagal", kelas: "bg-destructive/10 text-destructive" },
};

export default async function HalamanEkspor({ params }: PageProps<"/proyek/[proyekId]/ekspor">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const [cek, riwayat] = await Promise.all([periksaEkspor(p, proyekId), daftarEkspor(p, proyekId)]);
  const berjalan = riwayat.some((e) => e.status === "antre" || e.status === "diproses");
  return (
    <>
      <PemantauProses aktif={berjalan} />
      <JudulHalaman
        judul="Ekspor Word"
        deskripsi={`Mengisi template LEDPS resmi: narasi menggantikan instruksi dan kotak isian, halaman muka dan identitas diisi dari data proyek, maksimal ${BATAS_HALAMAN} halaman.`}
        remah={[{ label: "Beranda", href: `/proyek/${proyekId}` }, { label: "Ekspor Word" }]}
        aksi={<TombolEkspor proyekId={proyekId} bisa={cek.galat.length === 0 && !berjalan} />}
      />
      <Petunjuk
        kunci="proyek-ekspor"
        fungsi="Halaman ini memeriksa kesiapan LED lalu membuat berkas Word (.docx) sesuai template LEDPS untuk diunduh dan diunggah ke LAM Teknik."
        langkah={[
          "Selesaikan semua hal di daftar pemeriksaan (kriteria ditandai selesai, tidak ada penanda [BELUM ADA BUKTI], tabel dan gambar berjudul, tim penyusun terisi).",
          "Klik Ekspor ke Word. Berkas dibuat di server; halaman boleh ditinggal.",
          "Unduh berkas, buka di Microsoft Word, lalu pilih Yes/Ya saat diminta memperbarui field supaya daftar isi, tabel, dan gambar terisi.",
          "Ganti kotak \"Logo Perguruan Tinggi\" di halaman muka dengan logo asli, periksa sekali lagi, lalu simpan.",
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pemeriksaan sebelum ekspor</CardTitle>
          <CardDescription>
            {cek.galat.length === 0 ? "Semua syarat terpenuhi; LED siap diekspor." : `${cek.galat.length} hal perlu diselesaikan sebelum ekspor.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {cek.galat.length === 0 && (
            <p className="flex items-center gap-2"><CircleCheck className="size-4 text-emerald-600" aria-hidden />Tidak ada masalah.</p>
          )}
          {cek.galat.length > 0 && (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto">
              {cek.galat.map((g, i) => (
                <li key={i} className="flex gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />{g}</li>
              ))}
            </ul>
          )}
          {cek.peringatan.length > 0 && (
            <ul className="space-y-1.5 border-t pt-3 text-muted-foreground">
              {cek.peringatan.map((g, i) => (
                <li key={i} className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{g}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Kriteria ditandai selesai di halaman masing-masing kriteria. Tim penyusun diisi di menu{" "}
            <Link className="text-primary underline" href={`/proyek/${proyekId}/tim`}>Tim penyusun</Link>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat ekspor</CardTitle>
          <CardDescription>Berkas yang ditahan karena melebihi {BATAS_HALAMAN} halaman tidak bisa diunduh; ringkas narasi lalu ekspor ulang.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {riwayat.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">Belum ada ekspor.</p>
          ) : (
            <ul className="divide-y text-sm">
              {riwayat.map((e) => {
                const s = STATUS[e.status] ?? { label: e.status, kelas: "bg-muted" };
                const periksa = (e.pemeriksaan ?? {}) as { galat?: string[]; peringatan?: string[] };
                return (
                  <li key={e.id} className="flex flex-col gap-2 px-6 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="tabular-nums">{fmtWaktu.format(e.createdAt)}</span>
                      <Badge className={`gap-1 border-transparent ${s.kelas}`}>
                        {(e.status === "antre" || e.status === "diproses") && <Loader2 className="size-3 animate-spin" aria-hidden />}
                        {s.label}
                      </Badge>
                      {e.jumlahHalaman !== null && (
                        <span className="text-muted-foreground">{e.halamanPerkiraan ? "± " : ""}{e.jumlahHalaman} halaman{e.halamanPerkiraan ? " (perkiraan)" : ""}</span>
                      )}
                      {e.ukuran !== null && <span className="text-muted-foreground">{formatUkuran(e.ukuran)}</span>}
                      <span className="ml-auto flex items-center gap-1">
                        {e.status === "siap" && (
                          <Button asChild size="sm">
                            <a href={`/api/ekspor/${e.id}/berkas`}><Download aria-hidden />Unduh .docx</a>
                          </Button>
                        )}
                        {e.status !== "antre" && e.status !== "diproses" && <TombolHapusEkspor proyekId={proyekId} eksporId={e.id} />}
                      </span>
                    </div>
                    {e.pesan && <p className={e.status === "gagal" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}>{e.pesan}</p>}
                    {(periksa.galat?.length ?? 0) > 0 && (
                      <ul className="list-disc pl-5 text-destructive">{periksa.galat!.map((g, i) => <li key={i}>{g}</li>)}</ul>
                    )}
                    {(periksa.peringatan?.length ?? 0) > 0 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none">{periksa.peringatan!.length} catatan untuk diperiksa di Word</summary>
                        <ul className="mt-1 list-disc pl-5">{periksa.peringatan!.map((g, i) => <li key={i}>{g}</li>)}</ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
