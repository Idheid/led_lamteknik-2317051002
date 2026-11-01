import Link from "next/link";
import { CheckCircle2, Circle, ClipboardCheck, FileWarning, Info, ListTree } from "lucide-react";
import {
  bacaInfoEkstraksi, bacaRiwayatPeriksa, bacaSidikJariVersi, konfirmasiVersi, type JenisBerkasInstrumen, type RingkasanBerkas,
} from "@/modules/led/data/unggah-instrumen";
import type { HasilPeriksa } from "@/modules/led/domain/periksa-berkas-instrumen";
import type { DiagnosisTemplate } from "@/modules/led/domain/diagnosis-template";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { PemantauProses } from "@/components/status-proses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IsianHalamanBobot, TombolEkstraksi } from "./kendali-ekstraksi";
import { CentangKonfirmasi, TombolTandaiUsang } from "./periksa-berkas";

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
  tahunInstrumen: number;
  sidikJari: unknown;
  riwayatPeriksa: unknown;
  pemetaanTemplate: unknown;
  _count: { proyek: number; butir: number };
}

/** Apa yang terbaca dari isi berkas yang diterima (perbaikan 2 Nov 2026). */
function teksBacaan(r: RingkasanBerkas): string {
  const bagian = [
    r.tahun ? `tahun ${r.tahun}` : r.jenis !== "template" ? "tahun tidak tertulis" : null,
    r.jenjang ? namaJenjang(r.jenjang) : null,
    r.kriteria?.length ? `${r.kriteria.length} kriteria` : null,
  ].filter(Boolean);
  return bagian.length ? `Terbaca: ${bagian.join(" · ")}` : "";
}

function Baris({ ada, judul, nama, bacaan, children }: { ada: boolean; judul: string; nama: string | null; bacaan?: RingkasanBerkas; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        {ada ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="sudah diunggah" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="belum diunggah" />}
        <div className="min-w-0">
          <div className="font-medium">{judul}</div>
          <div className="truncate text-xs text-muted-foreground">{nama ?? "belum diunggah"}</div>
          {ada && bacaan && (
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
              {teksBacaan(bacaan) && <span>{teksBacaan(bacaan)}</span>}
              {bacaan.info.map((x) => <span key={x} className="flex items-start gap-1"><Info className="mt-0.5 size-3 shrink-0" aria-hidden />{x}</span>)}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

/** Kotak penolakan: judul, alasan, apa yang terbaca dari isi berkas, dan langkah berikutnya. */
function KotakPenolakan({ h }: { h: HasilPeriksa }) {
  return (
    <Alert variant="destructive">
      <FileWarning aria-hidden />
      <AlertTitle>{h.judul}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{h.alasan}</p>
        <dl className="grid gap-x-3 gap-y-0.5 text-xs text-foreground/80 sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Berkas</dt>
          <dd className="break-words">{h.namaBerkas}</dd>
          {h.terbaca.map((t) => (
            <div key={t.label} className="contents">
              <dt className="font-medium">{t.label}</dt>
              <dd className="break-words">{t.nilai}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs"><span className="font-medium">Langkah berikutnya:</span> {h.langkah}</p>
        <p className="text-xs text-muted-foreground">{new Date(h.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · berkas ini tidak disimpan.</p>
      </AlertDescription>
    </Alert>
  );
}

/** Diagnosis Template LED yang formatnya belum dikenali (I2): apa yang terbaca dan jalan keluarnya. */
export function KotakDiagnosis({ d, children }: { d: DiagnosisTemplate; children?: React.ReactNode }) {
  const r = d.ringkasan;
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
      <Info aria-hidden />
      <AlertTitle>{d.judul}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 text-foreground/90">
        <p>{d.pesan} {d.langkah}</p>
        <p className="text-xs">
          Terbaca: {r.jumlahParagraf} paragraf · BAB: {r.bab.join("; ") || "tidak ditemukan"} · kriteria: {r.kriteria.length ? r.kriteria.join("; ") : "tidak ditemukan"}
        </p>
        {r.gaya.length > 0 && (
          <table className="w-full text-left text-xs">
            <thead><tr className="text-muted-foreground"><th className="py-1 pr-2 font-medium">Gaya judul</th><th className="py-1 pr-2 text-right font-medium">Jumlah</th><th className="py-1 font-medium">Contoh</th></tr></thead>
            <tbody>
              {r.gaya.map((g) => (
                <tr key={g.gaya} className="border-t border-amber-200 dark:border-amber-900">
                  <td className="py-1 pr-2 font-mono">{g.gaya}</td><td className="py-1 pr-2 text-right tabular-nums">{g.jumlah}</td><td className="py-1 break-words">{g.contoh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {children}
      </AlertDescription>
    </Alert>
  );
}

/** Tiga berkas sumber instrumen jenjang dan kendali ekstraksinya (revisi 19 Okt 2026). */
export function BerkasSumber({ v, tahunUsang }: { v: VersiBerkas; tahunUsang: number | null }) {
  const info = bacaInfoEkstraksi(v.ekstraksi);
  const terkunci = v.status === "aktif" || v._count.proyek > 0;
  const berjalan = info?.status === "antre" || info?.status === "berjalan";
  const sj = bacaSidikJariVersi(v.sidikJari);
  // penolakan yang lebih baru daripada berkas jenis itu yang terakhir diterima
  const tolak = bacaRiwayatPeriksa(v.riwayatPeriksa).filter((h) => !sj[h.jenisBerkas as JenisBerkasInstrumen] || h.waktu > sj[h.jenisBerkas as JenisBerkasInstrumen]!.waktu);
  const konfirmasi = konfirmasiVersi(v);
  const siap = Boolean(v.templateLedNama && v.matriksNama && (!v.pedomanNama || v.halamanBobot)) && konfirmasi.length === 0
    && !sj.template?.diagnosis?.bisaDipetakan;
  const persen = info?.jumlahKelompok ? Math.round(((info.kelompokSelesai ?? 0) / info.jumlahKelompok) * 100) : 0;
  const url = (jenis: string) => `/api/led/instrumen/${v.id}/berkas/${jenis}`;
  return (
    <Card>
      <PemantauProses aktif={berjalan} detik={4} />
      <CardHeader>
        <CardTitle className="text-base">Berkas sumber dan ekstraksi · {v.jenjangUtama ? namaJenjang(v.jenjangUtama) : ""} · tahun {v.tahunInstrumen}</CardTitle>
        <CardDescription>
          Template diurai tanpa AI. Tabel Matriks Penilaian dibaca per baris lalu dikirim ke Gemini sedikit demi sedikit; bila kuota habis,
          ekstraksi berhenti rapi dan bisa dilanjutkan dengan kunci lain atau esok hari.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {tolak[0] && <KotakPenolakan h={tolak[0]} />}
        {tolak.length > 1 && (
          <details className="rounded-lg border p-3 text-xs">
            <summary className="cursor-pointer font-medium">Penolakan sebelumnya ({tolak.length - 1})</summary>
            <div className="mt-2 flex flex-col gap-2">{tolak.slice(1).map((h) => <KotakPenolakan key={h.waktu} h={h} />)}</div>
          </details>
        )}
        {v.templateLedNama && sj.template?.diagnosis?.bisaDipetakan && (
          <KotakDiagnosis d={sj.template.diagnosis}>
            {!terkunci && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href={`/led/instrumen/${v.id}/pemetaan`}><ListTree aria-hidden />Pemetaan judul</Link></Button>
              </div>
            )}
          </KotakDiagnosis>
        )}
        {v.templateLedNama && v.pemetaanTemplate != null && !sj.template?.diagnosis?.bisaDipetakan && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Template dibaca dengan pemetaan judul dari Admin.
            <Link href={`/led/instrumen/${v.id}/pemetaan`} className="text-primary hover:underline">{terkunci ? "Lihat pemetaan" : "Ubah pemetaan"}</Link>
          </p>
        )}
        <ul className="divide-y">
          <Baris ada={Boolean(v.templateLedNama)} judul="Template LED (.docx)" nama={v.templateLedNama} bacaan={sj.template}>
            {!terkunci && <UnggahBerkas ringkas segarkanSaatGagal url={url("template")} accept=".docx" label={v.templateLedNama ? "Ganti" : "Unggah"} />}
          </Baris>
          <Baris ada={Boolean(v.matriksNama)} judul="Matriks Penilaian (.pdf)" nama={v.matriksNama} bacaan={sj.matriks}>
            {v.matriksNama && <a href={url("matriks")} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Buka</a>}
            {!terkunci && <UnggahBerkas ringkas segarkanSaatGagal url={url("matriks")} accept=".pdf" label={v.matriksNama ? "Ganti" : "Unggah"} />}
          </Baris>
          <Baris ada={Boolean(v.pedomanNama)} judul="Pedoman Penilaian (.pdf)" nama={v.pedomanNama} bacaan={sj.pedoman}>
            {v.pedomanNama && <a href={url("pedoman")} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Buka</a>}
            {!terkunci && <UnggahBerkas ringkas segarkanSaatGagal url={url("pedoman")} accept=".pdf" label={v.pedomanNama ? "Ganti" : "Unggah"} />}
          </Baris>
        </ul>
        {konfirmasi.length > 0 && !terkunci && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-xs font-medium">Wajib dicentang sebelum ekstraksi</p>
            {[...new Map(konfirmasi.map((k) => [k.jenis, k])).values()].map((k) => (
              <CentangKonfirmasi key={k.jenis} versiId={v.id} jenis={k.jenis} teks={k.teks} nonaktif={terkunci} />
            ))}
          </div>
        )}
        {tahunUsang !== null && (v.templateLedNama || v.matriksNama || v.pedomanNama) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs text-muted-foreground">
            <span>Sudah ada instrumen aktif tahun {tahunUsang} untuk jenjang ini. Tandai berkas versi ini usang supaya tidak terunggah lagi.</span>
            <TombolTandaiUsang versiId={v.id} tahunBaru={tahunUsang} />
          </div>
        )}
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
            <p className="text-xs text-muted-foreground">
              Unggah Template LED dan Matriks Penilaian (dan halaman tabel bobot bila Pedoman diunggah){konfirmasi.length ? ", lalu centang konfirmasi di atas," : ""} untuk mulai.
            </p>
          )}
        </div>
        {v._count.butir > 0 && (
          <Button asChild variant={v.status === "diekstrak" ? "default" : "outline"} className="self-start">
            <Link href={`/led/instrumen/${v.id}/cek`}><ClipboardCheck aria-hidden />Periksa hasil ekstraksi ({v._count.butir} butir)</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
