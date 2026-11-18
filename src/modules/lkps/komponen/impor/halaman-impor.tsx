"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/import/page.tsx.
// Gabung LKPS G5/G6: alamat /api/lkps/impor dan /api/lkps/onedata/sinkron; tombol sinkron nonaktif bila One Data mati.
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Card, Field, Select, Button, Alert, Table, toast). Alur sama:
// sinkron One Data lewat tombol (bukan realtime, keputusan Adrianne), atau unggah berkas → pratinjau → terapkan.
// Perbedaan: pratinjau 3 baris pertama tampil sebagai tabel (asal: JSON mentah); format .xls tidak ditawarkan lagi
// (pembaca G4 memakai exceljs: xlsx, csv, json); tombol sinkron/ekstraksi/terapkan hanya untuk Tim Prodi (penulis
// isian kriteria), peran lain melihat pemberitahuan hanya baca.

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Database, FileSpreadsheet, Globe2, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";

interface HasilEkstraksi {
  domain: string;
  kriteriaTarget: string;
  tabelTarget: string;
  recordsProcessed: number;
  items: Record<string, unknown>[];
}

interface HasilSinkron {
  message?: string;
  details?: Record<string, string>;
}

const DOMAIN = [
  ["auto", "Deteksi otomatis dari kolom"],
  ["sdm", "SDM dosen (Tabel 3.a.1 & 3.a.4)"],
  ["mahasiswa", "Seleksi mahasiswa baru (Tabel 2.a)"],
  ["kerjasama", "Kerja sama tridharma (Tabel 1.1–1.3)"],
  ["tracer", "Tracer study & waktu tunggu (Tabel 8.d)"],
];

function teksSel(v: unknown): string {
  if (v === null || v === undefined || v === "") return "–";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

export default function HalamanImpor({ oneDataAktif }: { oneDataAktif: boolean }) {
  const { canEdit } = useModulePermission("kerjasama");
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [result, setResult] = useState<HasilEkstraksi | null>(null);
  const [syncResult, setSyncResult] = useState<HasilSinkron | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  async function sinkron() {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await kirimLkps("/api/lkps/onedata/sinkron", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: "all" }),
      });
      if (res.ok) setSyncResult(await res.json());
    } finally {
      setSyncLoading(false);
    }
  }

  async function ekstrak(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    setApplySuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("domain", domain);
      const res = await kirimLkps("/api/lkps/impor", { method: "POST", body: fd });
      if (res.ok) setResult((await res.json()).result);
    } finally {
      setLoading(false);
    }
  }

  async function terapkan() {
    if (!result?.items) return;
    setApplyLoading(true);
    setApplySuccess(null);
    try {
      const res = await kirimLkps("/api/lkps/impor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", domain: result.domain, items: result.items }),
      });
      if (res.ok) {
        const pesan = (await res.json()).message || "Data berhasil disimpan ke basis data LKPS.";
        setApplySuccess(pesan);
        toast.success(pesan);
      }
    } finally {
      setApplyLoading(false);
    }
  }

  const contoh = result?.items.slice(0, 3) ?? [];
  const kolom = [...new Set(contoh.flatMap((r) => Object.keys(r)))].slice(0, 8);

  return (
    <>
      <JudulHalaman
        judul="Impor One Data"
        deskripsi="Tarik data terbaru dari One Data Unila untuk prodi aktif, atau unggah berkas ekspor (.xlsx, .csv, .json)."
      />
      <RoleNotice module="kerjasama" customMessage="Impor dan sinkron One Data menulis isian kriteria, jadi hanya dapat dijalankan Tim Prodi." />

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe2 className="size-4 text-primary" aria-hidden />Sinkron langsung dari One Data (per prodi)</CardTitle>
          <CardDescription>
            Hanya menarik data milik program studi aktif dan hanya saat tombol ditekan (tidak berjalan otomatis).
          </CardDescription>
          <CardAction>
            <Button
              onClick={() => void sinkron()} disabled={syncLoading || !oneDataAktif || !canEdit}
              title={oneDataAktif ? undefined : "Sinkron One Data belum diaktifkan"}
            >
              <RefreshCw className={syncLoading ? "animate-spin" : undefined} aria-hidden />
              {syncLoading ? "Menghubungkan ke One Data…" : "Tarik data terbaru prodi"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {!oneDataAktif && (
            <p role="status" className="font-medium">Sinkron One Data belum diaktifkan. Impor berkas di bawah tetap bisa dipakai.</p>
          )}
          <p className="flex items-start gap-2 text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            One Data hanya menyediakan data teks. Berkas fisik (PDF MoU, SK, sertifikat, RPS) tetap diunggah di halaman kriteria masing-masing.
          </p>
          {syncResult && (
            <Alert>
              <CheckCircle2 aria-hidden />
              <AlertTitle>{syncResult.message}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {Object.entries(syncResult.details ?? {}).map(([k, v]) => <li key={k}>{v}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UploadCloud className="size-4 text-primary" aria-hidden />Unggah berkas One Data</CardTitle>
            <CardDescription>Langkah 1: pilih jenis data dan berkas, lalu ekstrak untuk melihat pratinjau.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void ekstrak(e)}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="impor-domain">Target domain / modul</FieldLabel>
                  <Select value={domain} onValueChange={setDomain}>
                    <SelectTrigger id="impor-domain" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{DOMAIN.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="impor-berkas">Berkas</FieldLabel>
                  <Input id="impor-berkas" type="file" accept=".xlsx,.csv,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <FieldDescription>Format .xlsx, .csv, atau .json.</FieldDescription>
                </Field>
                <Button type="submit" disabled={!file || loading || !canEdit} className="w-fit">
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Database aria-hidden />}
                  {loading ? "Mengekstrak data…" : "Ekstrak dan pratinjau"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden />Hasil pemetaan kolom</CardTitle>
            <CardDescription>Langkah 2: periksa pratinjau, lalu terapkan ke LKPS prodi aktif.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {result ? (
              <>
                <div className="flex flex-wrap gap-1.5 text-sm">
                  <Badge variant="secondary">Domain: {result.domain}</Badge>
                  <Badge variant="outline">{result.kriteriaTarget} · {result.tabelTarget}</Badge>
                  <Badge variant="outline">{result.recordsProcessed} baris</Badge>
                </div>
                {contoh.length > 0 && (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader><TableRow>{kolom.map((k) => <TableHead key={k} className="whitespace-nowrap">{k}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {contoh.map((r, i) => <TableRow key={i}>{kolom.map((k) => <TableCell key={k} className="max-w-48 truncate">{teksSel(r[k])}</TableCell>)}</TableRow>)}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Pratinjau {contoh.length} dari {result.recordsProcessed} baris.</p>
                <Button className="w-fit" disabled={applyLoading || !canEdit} onClick={() => void terapkan()}>
                  {applyLoading ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}
                  {applyLoading ? "Menerapkan…" : "Terapkan ke basis data LKPS"}
                </Button>
                {applySuccess && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{applySuccess}</p>}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <FileSpreadsheet className="size-8" aria-hidden />
                Belum ada berkas diekstrak. Unggah berkas One Data untuk memulai pemetaan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
