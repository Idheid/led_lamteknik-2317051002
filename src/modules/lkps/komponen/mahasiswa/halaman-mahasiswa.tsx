"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/mahasiswa/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }. Gabung LKPS G7: dibuat ulang dengan komponen LED (Tabs, Table,
// Input, Card, Alert, toast). Rumus RMD, skor, dan isi simpan ({ seleksi, asing }) tidak berubah.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Info, Users } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import {
  Angka, BarisAngka, InputAngka, KartuHitung, KartuTabel, LencanaSkor, LencanaTahun, TombolSimpan,
} from "@/modules/lkps/komponen/bersama/ui-lkps";

const TAHUN_LIST = ["TS", "TS-1", "TS-2", "TS-3", "TS-4"];
const TAHUN_ASING = ["TS", "TS-1", "TS-2"];

interface SeleksiRow {
  tahun: string;
  dayaTampung: number;
  jumlahPendaftar: number;
  jumlahLulusSeleksi: number;
  mbReguler: number;
  mbTransfer: number;
  maReguler: number;
  maTransfer: number;
}

interface AsingRow {
  tahun: string;
  fullTime: number;
  partTime: number;
}

const initSeleksi = (): SeleksiRow[] =>
  TAHUN_LIST.map((t) => ({ tahun: t, dayaTampung: 0, jumlahPendaftar: 0, jumlahLulusSeleksi: 0, mbReguler: 0, mbTransfer: 0, maReguler: 0, maTransfer: 0 }));
const initAsing = (): AsingRow[] => TAHUN_ASING.map((t) => ({ tahun: t, fullTime: 0, partTime: 0 }));

// ─── Rumus kode asal (tanpa perubahan) ────────────────────────

function hitungRMD(maReguler: number, maTransfer: number, ndtps: number): number {
  if (ndtps === 0) return 0;
  return (maReguler + maTransfer) / ndtps;
}

function getSkorRMD(rmd: number): { skor: number; label: string } {
  if (rmd >= 10 && rmd <= 20) return { skor: 4, label: "Ideal (10–20)" };
  if ((rmd >= 5 && rmd < 10) || (rmd > 20 && rmd <= 30)) return { skor: 3, label: "Baik" };
  if (rmd > 0) return { skor: 2, label: "Cukup" };
  return { skor: 1, label: "Kurang" };
}

const KOLOM_SELEKSI = [
  ["dayaTampung", "Daya tampung"], ["jumlahPendaftar", "Jumlah pendaftar"], ["jumlahLulusSeleksi", "Lulus seleksi"],
  ["mbReguler", "Mahasiswa baru reguler"], ["mbTransfer", "Mahasiswa baru transfer"],
  ["maReguler", "Mahasiswa aktif reguler"], ["maTransfer", "Mahasiswa aktif transfer"],
] as const;

type Baris = Record<string, number | string | null>;

export default function HalamanMahasiswa() {
  const { canEdit } = useModulePermission("mahasiswa");
  const [seleksi, setSeleksi] = useState<SeleksiRow[]>(initSeleksi());
  const [asing, setAsing] = useState<AsingRow[]>(initAsing());
  const [ndtps, setNdtps] = useState(10);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await kirimLkps("/api/lkps/mahasiswa");
    if (!res.ok) return;
    const data = (await res.json()) as { seleksi?: Baris[]; asing?: Baris[] };
    const angka = (v: unknown) => (typeof v === "number" ? v : 0);
    if (data.seleksi?.length) {
      setSeleksi(TAHUN_LIST.map((t) => {
        const f = data.seleksi!.find((s) => s.tahunSemester === t);
        return {
          tahun: t,
          dayaTampung: angka(f?.dayaTampung),
          jumlahPendaftar: angka(f?.jumlahPendaftar),
          jumlahLulusSeleksi: angka(f?.jumlahLulusSeleksi),
          mbReguler: angka(f?.mahasiswaBaruReguler),
          mbTransfer: angka(f?.mahasiswaBaruTransfer),
          maReguler: angka(f?.mahasiswaAktifReguler),
          maTransfer: angka(f?.mahasiswaAktifTransfer),
        };
      }));
    }
    if (data.asing?.length) {
      setAsing(TAHUN_ASING.map((t) => {
        const f = data.asing!.find((a) => a.tahunSemester === t);
        return { tahun: t, fullTime: angka(f?.jumlahFullTime), partTime: angka(f?.jumlahPartTime) };
      }));
    }
  }, []);

  useEffect(() => {
    // muat awal sesudah render (pola sama dengan halaman LKPS lain)
    const id = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  const updateSeleksi = (tahun: string, kolom: keyof SeleksiRow, v: number) =>
    setSeleksi((l) => l.map((r) => (r.tahun === tahun ? { ...r, [kolom]: v } : r)));
  const updateAsing = (tahun: string, kolom: keyof AsingRow, v: number) =>
    setAsing((l) => l.map((r) => (r.tahun === tahun ? { ...r, [kolom]: v } : r)));

  const ts = seleksi.find((r) => r.tahun === "TS");
  const totalMA = (ts?.maReguler ?? 0) + (ts?.maTransfer ?? 0);
  const rmd = hitungRMD(ts?.maReguler ?? 0, ts?.maTransfer ?? 0, ndtps);
  const { skor, label } = getSkorRMD(rmd);
  const asingTS = asing.filter((r) => r.tahun === "TS").reduce((a, r) => a + r.fullTime + r.partTime, 0);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/mahasiswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seleksi, asing }),
      });
      if (res.ok) {
        await fetchData();
        toast.success("Data mahasiswa tersimpan.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <JudulHalaman judul="Kriteria 2: Mahasiswa" deskripsi="Tabel 2.a dan 2.b LKPS: seleksi mahasiswa baru dan mahasiswa asing. RMD dihitung otomatis." />
      <RoleNotice module="mahasiswa" />

      <KartuHitung
        judul="Rasio Mahasiswa Dosen (RMD)"
        deskripsi="Dihitung langsung dari mahasiswa aktif TS di Tabel 2.a dan jumlah DTPS."
        skor={<LencanaSkor skor={skor} label={label} />}
        rumus={<>RMD = Jumlah MA (TS) / NDTPS = {totalMA} / {ndtps} = <strong>{rmd.toFixed(2)}</strong></>}
      >
        <BarisAngka>
          <Angka label="MA reguler (TS)" nilai={ts?.maReguler ?? 0} nada="text-cyan-700 dark:text-cyan-300" />
          <Angka label="MA transfer (TS)" nilai={ts?.maTransfer ?? 0} nada="text-blue-700 dark:text-blue-300" />
          <Angka label="Total MA (TS)" nilai={totalMA} nada="text-violet-700 dark:text-violet-300" />
          <Angka label="Mahasiswa asing (TS)" nilai={asingTS} nada="text-emerald-700 dark:text-emerald-300" />
          <Field orientation="horizontal" className="ml-auto w-auto">
            <FieldLabel htmlFor="rmd-ndtps" className="whitespace-nowrap">Jumlah DTPS</FieldLabel>
            <Input id="rmd-ndtps" type="number" min={1} className="w-20 text-center" disabled={!canEdit} value={ndtps} onChange={(e) => setNdtps(parseInt(e.target.value) || 1)} />
          </Field>
        </BarisAngka>
      </KartuHitung>

      <Tabs defaultValue="seleksi" className="gap-4">
        <TabsList>
          <TabsTrigger value="seleksi"><Users aria-hidden />Tabel 2.a · Seleksi mahasiswa baru</TabsTrigger>
          <TabsTrigger value="asing"><Globe aria-hidden />Tabel 2.b · Mahasiswa asing</TabsTrigger>
        </TabsList>

        <TabsContent value="seleksi">
          <KartuTabel nomor={2} judul="Tabel 2.a · Seleksi mahasiswa baru" deskripsi="Isi per tahun akademik, TS sampai TS-4.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="pl-6 align-bottom">Tahun</TableHead>
                  <TableHead rowSpan={2} className="align-bottom">Daya tampung</TableHead>
                  <TableHead rowSpan={2} className="align-bottom">Jumlah pendaftar</TableHead>
                  <TableHead rowSpan={2} className="align-bottom">Lulus seleksi</TableHead>
                  <TableHead colSpan={2} className="bg-blue-500/5 text-center">Mahasiswa baru</TableHead>
                  <TableHead colSpan={2} className="bg-emerald-500/5 pr-6 text-center">Mahasiswa aktif</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="bg-blue-500/5">Reguler</TableHead>
                  <TableHead className="bg-blue-500/5">Transfer</TableHead>
                  <TableHead className="bg-emerald-500/5">Reguler</TableHead>
                  <TableHead className="bg-emerald-500/5 pr-6">Transfer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seleksi.map((row) => (
                  <TableRow key={row.tahun}>
                    <TableCell className="pl-6"><LencanaTahun tahun={row.tahun} /></TableCell>
                    {KOLOM_SELEKSI.map(([kolom, nama], i) => (
                      <TableCell key={kolom} className={i === KOLOM_SELEKSI.length - 1 ? "pr-6" : undefined}>
                        <InputAngka label={`${nama} ${row.tahun}`} value={row[kolom]} disabled={!canEdit} onChange={(v) => updateSeleksi(row.tahun, kolom, v)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KartuTabel>
        </TabsContent>

        <TabsContent value="asing" className="flex flex-col gap-4">
          <KartuTabel nomor={2} judul="Tabel 2.b · Mahasiswa asing" deskripsi="Jumlah mahasiswa asing full-time dan part-time pada TS, TS-1, TS-2.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tahun</TableHead>
                  <TableHead>Full-time</TableHead>
                  <TableHead>Part-time</TableHead>
                  <TableHead className="pr-6">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asing.map((row) => (
                  <TableRow key={row.tahun}>
                    <TableCell className="pl-6"><LencanaTahun tahun={row.tahun} /></TableCell>
                    <TableCell><InputAngka label={`Full-time ${row.tahun}`} value={row.fullTime} disabled={!canEdit} onChange={(v) => updateAsing(row.tahun, "fullTime", v)} /></TableCell>
                    <TableCell><InputAngka label={`Part-time ${row.tahun}`} value={row.partTime} disabled={!canEdit} onChange={(v) => updateAsing(row.tahun, "partTime", v)} /></TableCell>
                    <TableCell className="pr-6 font-semibold tabular-nums">{row.fullTime + row.partTime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KartuTabel>
          <Alert>
            <Info aria-hidden />
            <AlertDescription>Mahasiswa asing full-time berkontribusi dalam perhitungan skor internasionalisasi program studi.</AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {canEdit && (
        <div className="flex justify-end">
          <TombolSimpan sibuk={saving} onClick={() => void handleSave()}>Simpan data mahasiswa</TombolSimpan>
        </div>
      )}
    </>
  );
}
