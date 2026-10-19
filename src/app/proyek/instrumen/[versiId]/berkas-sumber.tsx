import Link from "next/link";
import { CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import { bacaInfoEkstraksi } from "@/lib/data/unggah-instrumen";
import { namaJenjang } from "@/lib/domain/instrumen";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { PemantauProses } from "@/components/status-proses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { IsianHalamanBobot, TombolEkstraksi } from "./kendali-ekstraksi";

const LABEL_EKSTRAKSI: Record<string, string> = {
  antre: "Menunggu antrean", berjalan: "Sedang berjalan", tertunda: "Tertunda", selesai: "Selesai", gagal: "Gagal",
};
const LABEL_LANGKAH: Record<string, string> = {
  template: "mengurai Template LED", bobot: "membaca tabel bobot", matriks: "membaca Matriks Penilaian dengan AI", selesai: "selesai",
};

interface VersiBerkas {
  id: string;
  status: string;
  jenjangUtama: string | null;
  templateLedNama: string | null;
  matriksNama: string | null;
  pedomanNama: string | null;
  halamanBobot: string | null;
  ekstraksi: unknown;
  _count: { proyek: number; butir: number };
}

function Baris({ ada, judul, nama, children }: { ada: boolean; judul: string; nama: string | null; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        {ada ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="sudah diunggah" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="belum diunggah" />}
        <div className="min-w-0">
          <div className="font-medium">{judul}</div>
          <div className="truncate text-xs text-muted-foreground">{nama ?? "belum diunggah"}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

/** Tiga berkas sumber instrumen jenjang dan kendali ekstraksinya (revisi 19 Okt 2026). */
export function BerkasSumber({ v }: { v: VersiBerkas }) {
  const info = bacaInfoEkstraksi(v.ekstraksi);
  const terkunci = v.status === "aktif" || v._count.proyek > 0;
  const berjalan = info?.status === "antre" || info?.status === "berjalan";
  const siap = Boolean(v.templateLedNama && v.matriksNama && (!v.pedomanNama || v.halamanBobot));
  const persen = info?.jumlahKelompok ? Math.round(((info.kelompokSelesai ?? 0) / info.jumlahKelompok) * 100) : 0;
  const url = (jenis: string) => `/api/instrumen/${v.id}/berkas/${jenis}`;
  return (
    <Card>
      <PemantauProses aktif={berjalan} detik={4} />
      <CardHeader>
        <CardTitle className="text-base">Berkas sumber dan ekstraksi · {v.jenjangUtama ? namaJenjang(v.jenjangUtama) : ""}</CardTitle>
        <CardDescription>
          Template diurai tanpa AI. Tabel Matriks Penilaian dibaca per baris lalu dikirim ke Gemini sedikit demi sedikit; bila kuota habis,
          ekstraksi berhenti rapi dan bisa dilanjutkan dengan kunci lain atau esok hari.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <ul className="divide-y">
          <Baris ada={Boolean(v.templateLedNama)} judul="Template LED (.docx)" nama={v.templateLedNama}>
            {!terkunci && <UnggahBerkas ringkas url={url("template")} accept=".docx" label={v.templateLedNama ? "Ganti" : "Unggah"} />}
          </Baris>
          <Baris ada={Boolean(v.matriksNama)} judul="Matriks Penilaian (.pdf)" nama={v.matriksNama}>
            {v.matriksNama && <a href={url("matriks")} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Buka</a>}
            {!terkunci && <UnggahBerkas ringkas url={url("matriks")} accept=".pdf" label={v.matriksNama ? "Ganti" : "Unggah"} />}
          </Baris>
          <Baris ada={Boolean(v.pedomanNama)} judul="Pedoman Penilaian (.pdf)" nama={v.pedomanNama}>
            {v.pedomanNama && <a href={url("pedoman")} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Buka</a>}
            {!terkunci && <UnggahBerkas ringkas url={url("pedoman")} accept=".pdf" label={v.pedomanNama ? "Ganti" : "Unggah"} />}
          </Baris>
        </ul>
        {v.pedomanNama && (
          <IsianHalamanBobot versiId={v.id} awal={v.halamanBobot ?? ""} usulan={info?.usulanHalamanBobot ?? null} nonaktif={terkunci} />
        )}
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-medium">Ekstraksi: </span>
              {info ? (
                <Badge variant={info.status === "selesai" ? "default" : "outline"}>{LABEL_EKSTRAKSI[info.status] ?? info.status}</Badge>
              ) : <span className="text-muted-foreground">belum dimulai</span>}
              {info?.status === "berjalan" && info.langkah && <span className="ml-2 text-xs text-muted-foreground">{LABEL_LANGKAH[info.langkah] ?? info.langkah}</span>}
            </div>
            {!terkunci && <TombolEkstraksi versiId={v.id} status={info?.status ?? null} siap={siap} />}
          </div>
          {info?.jumlahKelompok ? (
            <div className="flex items-center gap-3">
              <Progress value={persen} className="h-2 flex-1" aria-label="Kemajuan membaca matriks" />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {info.kelompokSelesai ?? 0}/{info.jumlahKelompok} kelompok · {info.jumlahBaris} baris matriks
              </span>
            </div>
          ) : null}
          {info?.pesan && <p className="text-xs text-amber-800 dark:text-amber-200">{info.pesan}</p>}
          {info?.subBaru && info.subBaru.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sub-bagian baru dari template (tidak ada padanan di instrumen sebelumnya): {info.subBaru.join(", ")}. Periksa di daftar bagian.
            </p>
          )}
          {!siap && !terkunci && (
            <p className="text-xs text-muted-foreground">Unggah Template LED dan Matriks Penilaian (dan halaman tabel bobot bila Pedoman diunggah) untuk mulai.</p>
          )}
        </div>
        {v._count.butir > 0 && (
          <Button asChild variant={v.status === "diekstrak" ? "default" : "outline"} className="self-start">
            <Link href={`/proyek/instrumen/${v.id}/cek`}><ClipboardCheck aria-hidden />Periksa hasil ekstraksi ({v._count.butir} butir)</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
