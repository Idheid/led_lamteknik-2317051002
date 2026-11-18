"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/kriteria/[id]/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }, peran dari kerangka LED.
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Card, Table, Input, Badge, Alert, Skeleton, toast). Kolom isian,
// baris awal, ketentuan instrumen, dan aksi saveTableRows tidak berubah. Perbedaan:
// - tautan kembali/konfigurasi ke /lkps dan /lkps/konfigurasi (asal: /dashboard dan /konfigurasi, alamat lama);
// - isian, tambah/hapus baris, dan tombol simpan hanya untuk Tim Prodi (asal: tombol simpan bawah dan isian tetap aktif
//   untuk peran baca, lalu ditolak server); peran baca melihat tabel hanya baca.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Info, Plus, SlidersHorizontal, TableProperties, Trash2 } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import { IkonKriteria } from "@/modules/lkps/komponen/bersama/kriteria-tampil";
import { KartuTabel, TautanBukti, TombolSimpan } from "@/modules/lkps/komponen/bersama/ui-lkps";

interface ParsedKetentuan {
  sheetRef?: string;
  targetJenjang?: string;
  konvensiWaktu?: string;
  kolom?: string[] | string;
  dokumenBukti?: string;
  rumusPenilaian?: string;
  rows?: BarisIsian[];
}

interface BarisIsian {
  id?: string;
  namaKegiatan?: string;
  kategori?: string;
  tahun?: string;
  buktiDokumen?: string;
  keterangan?: string;
  [kunci: string]: unknown;
}

interface TabelConfigItem {
  id: string;
  nomorTabel: string;
  namaTabel: string;
  deskripsi: string | null;
  levelPengisi: string;
  wajibUploadBukti: boolean;
  formatKolom: string | null;
  statusAktif: boolean;
}

interface KriteriaDetail {
  id: string;
  nomorUrut: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  levelWewenang: string;
  statusAktif: boolean;
  regulasi?: { id: string; nama: string; tahunAkademik: string };
  tabelList: TabelConfigItem[];
}

function parseKetentuan(formatKolom: string | null): ParsedKetentuan {
  if (!formatKolom) return {};
  try {
    return JSON.parse(formatKolom);
  } catch {
    return { kolom: formatKolom };
  }
}

const KOLOM: [keyof BarisIsian & string, string, string][] = [
  ["namaKegiatan", "Judul / nama entitas", "Contoh: Proposal riset AI keteknikan"],
  ["kategori", "Kategori / jenis", "Kategori / jenis"],
  ["tahun", "Tahun / periode", "TS / 2024"],
  ["buktiDokumen", "Tautan bukti / dokumen", "https://drive.google.com/…"],
  ["keterangan", "Keterangan / catatan", "Catatan tambahan"],
];

const NADA_WEWENANG: Record<string, string> = {
  UPPS: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  PRODI: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export default function HalamanKriteria({ params }: { params: Promise<{ id: string }> }) {
  const { id: kriteriaId } = use(params);
  const { peran } = useInfoLkps();
  const canManageStructure = peran === "ADMIN";
  const canEditData = peran === "TIM_PRODI";

  const [kriteria, setKriteria] = useState<KriteriaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingTableId, setSavingTableId] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, BarisIsian[]>>({});

  const barisBaru = useCallback((id: string, k?: KriteriaDetail | null): BarisIsian => ({
    id, namaKegiatan: "", kategori: "", tahun: k?.regulasi?.tahunAkademik || "2024/2025", buktiDokumen: "", keterangan: "",
  }), []);

  const fetchKriteria = useCallback(async () => {
    try {
      const res = await kirimLkps(`/api/lkps/kriteria/${kriteriaId}`);
      if (res.ok) {
        const data: KriteriaDetail = await res.json();
        setKriteria(data);
        const awal: Record<string, BarisIsian[]> = {};
        data.tabelList?.forEach((t) => {
          const parsed = parseKetentuan(t.formatKolom);
          awal[t.id] = Array.isArray(parsed.rows) && parsed.rows.length > 0 ? parsed.rows : [barisBaru("row_1", data)];
        });
        setTableData(awal);
      } else {
        setError((await res.json().catch(() => null))?.pesan || "Gagal memuat detail kriteria");
      }
    } finally {
      setLoading(false);
    }
  }, [kriteriaId, barisBaru]);

  useEffect(() => {
    void fetchKriteria();
  }, [fetchKriteria]);

  const ubahSel = (tabelId: string, i: number, kolom: string, nilai: string) =>
    setTableData((p) => ({ ...p, [tabelId]: (p[tabelId] || []).map((r, j) => (j === i ? { ...r, [kolom]: nilai } : r)) }));
  const tambahBaris = (tabelId: string) => setTableData((p) => ({ ...p, [tabelId]: [...(p[tabelId] || []), barisBaru(`row_${Date.now()}`, kriteria)] }));
  const hapusBaris = (tabelId: string, i: number) => setTableData((p) => ({ ...p, [tabelId]: (p[tabelId] || []).filter((_, j) => j !== i) }));

  async function simpanTabel(tabelId: string) {
    setSavingTableId(tabelId);
    try {
      const res = await kirimLkps(`/api/lkps/kriteria/${kriteriaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveTableRows", payload: { tabelId, rows: tableData[tabelId] || [] } }),
      });
      if (res.ok) toast.success("Isian tabel tersimpan.");
    } finally {
      setSavingTableId(null);
    }
  }

  if (loading) {
    return (
      <>
        <JudulHalaman judul="Memuat kriteria…" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (error || !kriteria) {
    return (
      <>
        <JudulHalaman judul="Kriteria tidak ditemukan" />
        <Alert variant="destructive" className="max-w-2xl">
          <AlertCircle aria-hidden />
          <AlertTitle>{error || "Data kriteria tidak tersedia atau telah dihapus"}</AlertTitle>
          <AlertDescription>
            <p>Pastikan kriteria yang dituju terdaftar dalam regulasi aktif.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link href="/lkps"><ArrowLeft aria-hidden />Beranda LKPS</Link></Button>
              {canManageStructure && <Button asChild size="sm"><Link href="/lkps/konfigurasi"><SlidersHorizontal aria-hidden />Struktur kriteria & tabel</Link></Button>}
            </div>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <JudulHalaman
        judul={`${kriteria.kode}: ${kriteria.nama}`}
        deskripsi={`Instrumen akreditasi: ${kriteria.regulasi?.nama || "LAM Teknik 2024"}`}
        remah={[{ label: "Beranda LKPS", href: "/lkps" }, { label: kriteria.kode }]}
        aksi={canManageStructure && (
          <Button asChild variant="outline"><Link href="/lkps/konfigurasi"><SlidersHorizontal aria-hidden />Atur struktur</Link></Button>
        )}
      />

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <IkonKriteria nomor={0} besar="lg" />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{kriteria.kode}</Badge>
                <Badge className={NADA_WEWENANG[kriteria.levelWewenang] ?? "bg-violet-500/10 text-violet-700 dark:text-violet-300"}>Wewenang: {kriteria.levelWewenang}</Badge>
                <Badge variant="outline">{kriteria.tabelList?.length || 0} tabel instrumen</Badge>
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Kriteria kustom aktif</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {kriteria.deskripsi || "Kriteria akreditasi tambahan yang dikonfigurasi secara dinamis untuk mendukung kelengkapan instrumen evaluasi diri dan LKPS LAM Teknik."}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-2 text-center">
            <div className="text-xs text-muted-foreground">Tahun akademik</div>
            <div className="font-semibold tabular-nums">{kriteria.regulasi?.tahunAkademik || "2024/2025"}</div>
          </div>
        </CardContent>
      </Card>

      {kriteria.tabelList?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <TableProperties className="size-8 text-muted-foreground" aria-hidden />
            <div className="text-sm font-medium">Belum ada tabel di bawah {kriteria.kode}</div>
            <p className="text-sm text-muted-foreground">Admin UPPS dapat menambahkan tabel instrumen lewat Struktur kriteria & tabel.</p>
            {canManageStructure && <Button asChild size="sm"><Link href="/lkps/konfigurasi"><Plus aria-hidden />Tambahkan tabel</Link></Button>}
          </CardContent>
        </Card>
      ) : (
        kriteria.tabelList.map((tabel) => {
          const parsed = parseKetentuan(tabel.formatKolom);
          const rows = tableData[tabel.id] || [];
          const ketentuan = [
            ["Sheet", parsed.sheetRef], ["Target jenjang", parsed.targetJenjang], ["Konvensi waktu", parsed.konvensiWaktu], ["Dokumen bukti", parsed.dokumenBukti],
          ].filter(([, v]) => v) as [string, string][];
          return (
            <KartuTabel
              key={tabel.id}
              nomor={0}
              judul={`Tabel ${tabel.nomorTabel} · ${tabel.namaTabel}`}
              deskripsi={(
                <span className="flex flex-col gap-1.5">
                  {tabel.deskripsi && <span>{tabel.deskripsi}</span>}
                  <span className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">Pengisi: {tabel.levelPengisi}</Badge>
                    {tabel.wajibUploadBukti && <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300">Wajib bukti PDF</Badge>}
                    <Badge variant="secondary">{rows.length} baris</Badge>
                  </span>
                </span>
              )}
              aksi={canEditData && <Button size="sm" variant="outline" onClick={() => tambahBaris(tabel.id)}><Plus aria-hidden />Tambah baris</Button>}
            >
              {ketentuan.length > 0 && (
                <div className="mx-6 mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1 font-medium text-primary"><Info className="size-4" aria-hidden />Ketentuan instrumen</span>
                  {ketentuan.map(([l, v]) => <span key={l}><span className="text-muted-foreground">{l}:</span> <strong>{v}</strong></span>)}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    {KOLOM.map(([k, label]) => <TableHead key={k} className="min-w-40">{label}</TableHead>)}
                    {canEditData && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={row.id || i}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      {KOLOM.map(([k, label, contoh]) => (
                        <TableCell key={k}>
                          {canEditData ? (
                            <Input
                              aria-label={`${label} baris ${i + 1}`} placeholder={contoh} value={String(row[k] ?? "")}
                              onChange={(e) => ubahSel(tabel.id, i, k, e.target.value)}
                            />
                          ) : k === "buktiDokumen" ? (
                            <TautanBukti url={row.buktiDokumen || null} nama="Buka dokumen" kosong="Tidak ada" />
                          ) : (
                            String(row[k] ?? "") || "–"
                          )}
                        </TableCell>
                      ))}
                      {canEditData && (
                        <TableCell className="pr-6 text-right">
                          <Button size="icon" variant="ghost" aria-label={`Hapus baris ${i + 1}`} onClick={() => hapusBaris(tabel.id, i)}><Trash2 aria-hidden /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {canEditData && (
                <div className="flex justify-end px-6 pt-2 pb-4">
                  <TombolSimpan sibuk={savingTableId === tabel.id} onClick={() => void simpanTabel(tabel.id)}>Simpan tabel ini</TombolSimpan>
                </div>
              )}
            </KartuTabel>
          );
        })
      )}
    </>
  );
}
