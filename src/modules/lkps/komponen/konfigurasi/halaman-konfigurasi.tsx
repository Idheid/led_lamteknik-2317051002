"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/konfigurasi/page.tsx.
// Gabung LKPS G5: alamat /api/lkps/konfigurasi, galat { pesan }, hanya Admin UPPS (halaman juga dijaga server).
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Card, Table, Dialog, AlertDialog, Field, Select, Checkbox, Badge,
// toast). Aksi API (create/update/delete/setActive regulasi, kriteria, tabel; loadTemplateLAMTeknik), isian formulir,
// pencarian, saring wewenang, lompat kriteria, dan lipat/buka tetap sama. Perbedaan:
// - "Buka halaman" kriteria menuju /lkps/... (asal: /kerjasama dst., alamat lama);
// - pesan berhasil/galat memakai toast (asal: spanduk), hapus regulasi memakai dialog konfirmasi (asal: confirm());
// - fungsi ubah status kriteria/tabel kode asal tidak dipakai di tampilannya; status tetap diubah lewat formulir.

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown, ChevronsDownUp, ChevronsUpDown, Eye, FileStack, Pencil, Plus, Search, ShieldAlert, Sparkles, Star, Trash2, X,
} from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/modules/bersama/utils";
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import { IkonKriteria } from "@/modules/lkps/komponen/bersama/kriteria-tampil";

interface ParsedKetentuan {
  sheetRef?: string;
  targetJenjang?: string;
  konvensiWaktu?: string;
  kolom?: string[] | string;
  dokumenBukti?: string;
  rumusPenilaian?: string;
}

interface TabelItem {
  id: string;
  nomorTabel: string;
  namaTabel: string;
  deskripsi: string | null;
  levelPengisi: string;
  wajibUploadBukti: boolean;
  formatKolom: string | null;
  statusAktif: boolean;
}

interface KriteriaItem {
  id: string;
  nomorUrut: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  levelWewenang: string;
  statusAktif: boolean;
  tabelList: TabelItem[];
}

interface RegulasiItem {
  id: string;
  nama: string;
  tahunAkademik: string;
  statusAktif: boolean;
  keterangan: string | null;
  kriteriaList: KriteriaItem[];
}

type Wewenang = "ALL" | "UPPS" | "PRODI" | "BERSAMA";

const URL_BAKU: Record<number, string> = {
  1: "/lkps/kerjasama", 2: "/lkps/mahasiswa", 3: "/lkps/sdm", 4: "/lkps/keuangan", 5: "/lkps/pendidikan",
  6: "/lkps/penelitian", 7: "/lkps/pkm", 8: "/lkps/luaran", 9: "/lkps/penjaminan",
};
const alamatKriteria = (nomor: number, id: string) => URL_BAKU[nomor] || `/lkps/kriteria/${id}`;

const NADA_WEWENANG: Record<string, string> = {
  UPPS: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  PRODI: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  BERSAMA: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const JENJANG = ["Semua Jenjang", "Diploma 3 (D3)", "Sarjana Terapan (D4)", "Sarjana Teknik (S1)", "Sarjana & Sarjana Terapan", "Magister (S2) & Doktor (S3)"];
const WAKTU: [string, string][] = [
  ["TS", "TS (tahun saat pengajuan)"], ["TS-1 s.d. TS", "TS-1 s.d. TS (2 tahun)"], ["TS-2 s.d. TS", "TS-2 s.d. TS (3 tahun terakhir)"],
  ["TS-4 s.d. TS", "TS-4 s.d. TS (5 tahun terakhir)"], ["TS-6 s.d. TS", "TS-6 s.d. TS (kohor kelulusan 7 tahun)"], ["Dokumen Aktif Berlaku", "Dokumen aktif berlaku"],
];

function parseFormatKolom(formatKolom: string | null): ParsedKetentuan {
  if (!formatKolom) return {};
  try {
    return JSON.parse(formatKolom);
  } catch {
    return { kolom: formatKolom };
  }
}

const daftarKolom = (k: ParsedKetentuan["kolom"]) => (Array.isArray(k) ? k : typeof k === "string" && k ? [k] : []);

function PilihanBenar({ id, value, onChange, ya, tidak }: { id: string; value: boolean; onChange: (v: boolean) => void; ya: string; tidak: string }) {
  return (
    <Select value={value ? "true" : "false"} onValueChange={(v) => onChange(v === "true")}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="true">{ya}</SelectItem><SelectItem value="false">{tidak}</SelectItem></SelectContent>
    </Select>
  );
}

function KotakKpi({ label, nilai, nada }: { label: string; nilai: ReactNode; nada?: string }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="px-4">
        <div className={cn("text-xl font-semibold tabular-nums", nada)}>{nilai}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

const regulasiKosong = { id: "", nama: "", tahunAkademik: "", keterangan: "", statusAktif: true, cloneFromId: "" };
const kriteriaKosong = { id: "", nomorUrut: 1, kode: "", nama: "", deskripsi: "", levelWewenang: "PRODI", statusAktif: true };
const tabelKosong = {
  id: "", nomorTabel: "", sheetRef: "", namaTabel: "", deskripsi: "", levelPengisi: "PRODI", targetJenjang: "Semua Jenjang",
  konvensiWaktu: "TS-2 s.d. TS", kolomInput: "", dokumenBukti: "", rumusPenilaian: "", wajibUploadBukti: true, statusAktif: true,
};

export default function HalamanKonfigurasi() {
  const { peran } = useInfoLkps();
  const router = useRouter();
  const canManage = peran === "ADMIN";

  const [regulasiList, setRegulasiList] = useState<RegulasiItem[]>([]);
  const [selectedRegulasiId, setSelectedRegulasiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [wewenangFilter, setWewenangFilter] = useState<Wewenang>("ALL");
  const [selectedKriteriaPill, setSelectedKriteriaPill] = useState("ALL");
  const [collapsedKriteria, setCollapsedKriteria] = useState<Record<string, boolean>>({});

  const [regulasiForm, setRegulasiForm] = useState<typeof regulasiKosong | null>(null);
  const [kriteriaForm, setKriteriaForm] = useState<typeof kriteriaKosong | null>(null);
  const [tabelForm, setTabelForm] = useState<typeof tabelKosong | null>(null);
  const [targetKriteriaId, setTargetKriteriaId] = useState("");
  const [ketentuan, setKetentuan] = useState<{ tabel: TabelItem; kriteria: KriteriaItem; ketentuan: ParsedKetentuan } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [replaceExistingTemplate, setReplaceExistingTemplate] = useState(true);
  const [hapus, setHapus] = useState<{ type: "regulasi" | "kriteria" | "tabel"; id: string; name: string; subText?: string } | null>(null);

  const fetchData = useCallback(async (pilih?: string) => {
    try {
      const res = await kirimLkps(`/api/lkps/konfigurasi?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { regulasiList?: RegulasiItem[] };
      const list = data.regulasiList || [];
      setRegulasiList(list);
      setSelectedRegulasiId((lama) => {
        if (pilih && list.some((r) => r.id === pilih)) return pilih;
        if (lama && list.some((r) => r.id === lama)) return lama;
        return (list.find((r) => r.statusAktif) ?? list[0])?.id ?? "";
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /** Kirim satu aksi konfigurasi; sukses → toast, muat ulang, kembalikan JSON. */
  async function aksi(action: string, payload: unknown, sukses: string): Promise<Record<string, unknown> | null> {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/konfigurasi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      if (!res.ok) return null;
      const data = await res.json();
      toast.success((data.message as string) || sukses);
      // sidebar LKPS (kriteria tambahan) dirender layout server: segarkan supaya ikut berubah
      router.refresh();
      return data;
    } finally {
      setSaving(false);
    }
  }

  const currentRegulasi = regulasiList.find((r) => r.id === selectedRegulasiId) || regulasiList[0];
  const kriteriaList = useMemo(() => currentRegulasi?.kriteriaList ?? [], [currentRegulasi]);
  const totalTabel = kriteriaList.reduce((a, k) => a + (k.tabelList?.length || 0), 0);
  const totalBuktiWajib = kriteriaList.reduce((a, k) => a + (k.tabelList?.filter((t) => t.wajibUploadBukti).length || 0), 0);

  const terlipat = (id: string) => collapsedKriteria[id] ?? true;
  const lipatSemua = (v: boolean) => setCollapsedKriteria(Object.fromEntries(kriteriaList.map((k) => [k.id, v])));
  const bukaDanGulir = (id: string) => {
    setCollapsedKriteria((p) => ({ ...p, [id]: false }));
    setTimeout(() => document.getElementById(`kriteria-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  };

  // Saringan kode asal (tanpa perubahan)
  const filteredKriteriaList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return kriteriaList
      .filter((k) => (selectedKriteriaPill === "ALL" || k.id === selectedKriteriaPill) && (wewenangFilter === "ALL" || k.levelWewenang === wewenangFilter))
      .map((k) => {
        if (!q) return k;
        if (k.nama.toLowerCase().includes(q) || k.kode.toLowerCase().includes(q)) return k;
        return {
          ...k,
          tabelList: (k.tabelList || []).filter((t) =>
            t.namaTabel.toLowerCase().includes(q) || t.nomorTabel.toLowerCase().includes(q)
            || (t.deskripsi ?? "").toLowerCase().includes(q) || (t.formatKolom ?? "").toLowerCase().includes(q)),
        };
      })
      .filter((k) => !q || k.nama.toLowerCase().includes(q) || k.kode.toLowerCase().includes(q) || k.tabelList.length > 0);
  }, [kriteriaList, searchQuery, wewenangFilter, selectedKriteriaPill]);

  // ─── Regulasi ───
  async function simpanRegulasi(e: FormEvent) {
    e.preventDefault();
    if (!regulasiForm) return;
    const ubah = Boolean(regulasiForm.id);
    const data = await aksi(ubah ? "updateRegulasi" : "createRegulasi", regulasiForm, ubah ? "Regulasi diperbarui." : "Regulasi dan tahun baru ditambahkan.");
    if (data) {
      setRegulasiForm(null);
      await fetchData((data.regulasi as { id?: string } | undefined)?.id);
    }
  }

  // ─── Kriteria ───
  async function simpanKriteria(e: FormEvent) {
    e.preventDefault();
    if (!kriteriaForm || !currentRegulasi) return;
    const ubah = Boolean(kriteriaForm.id);
    const data = await aksi(ubah ? "updateKriteria" : "createKriteria", { ...kriteriaForm, regulasiId: currentRegulasi.id }, ubah ? "Kriteria diperbarui." : "Kriteria baru ditambahkan.");
    if (data) {
      const id = (data.kriteria as { id?: string } | undefined)?.id || kriteriaForm.id;
      setKriteriaForm(null);
      await fetchData();
      if (id) bukaDanGulir(id);
    }
  }

  // ─── Tabel ───
  function bukaTabel(kriteriaId: string, t?: TabelItem) {
    setTargetKriteriaId(kriteriaId);
    if (!t) return setTabelForm({ ...tabelKosong });
    const p = parseFormatKolom(t.formatKolom);
    setTabelForm({
      id: t.id, nomorTabel: t.nomorTabel, sheetRef: p.sheetRef || "", namaTabel: t.namaTabel, deskripsi: t.deskripsi || "",
      levelPengisi: t.levelPengisi, targetJenjang: p.targetJenjang || "Semua Jenjang", konvensiWaktu: p.konvensiWaktu || "TS-2 s.d. TS",
      kolomInput: daftarKolom(p.kolom).join(", "), dokumenBukti: p.dokumenBukti || "", rumusPenilaian: p.rumusPenilaian || "",
      wajibUploadBukti: t.wajibUploadBukti, statusAktif: t.statusAktif,
    });
  }

  async function simpanTabel(e: FormEvent) {
    e.preventDefault();
    if (!tabelForm) return;
    const ubah = Boolean(tabelForm.id);
    const kolom = tabelForm.kolomInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const formatKolom: ParsedKetentuan = {
      sheetRef: tabelForm.sheetRef || undefined,
      targetJenjang: tabelForm.targetJenjang || "Semua Jenjang",
      konvensiWaktu: tabelForm.konvensiWaktu || "TS-2 s.d. TS",
      kolom: kolom.length > 0 ? kolom : undefined,
      dokumenBukti: tabelForm.dokumenBukti || undefined,
      rumusPenilaian: tabelForm.rumusPenilaian || undefined,
    };
    const data = await aksi(ubah ? "updateTabel" : "createTabel", {
      id: tabelForm.id, kriteriaId: targetKriteriaId, nomorTabel: tabelForm.nomorTabel, namaTabel: tabelForm.namaTabel,
      deskripsi: tabelForm.deskripsi, levelPengisi: tabelForm.levelPengisi, wajibUploadBukti: tabelForm.wajibUploadBukti,
      formatKolom, statusAktif: tabelForm.statusAktif,
    }, ubah ? "Tabel LKPS diperbarui." : "Tabel LKPS baru ditambahkan.");
    if (data) {
      setTabelForm(null);
      await fetchData();
      if (targetKriteriaId) bukaDanGulir(targetKriteriaId);
    }
  }

  async function jalankanHapus() {
    if (!hapus) return;
    const action = hapus.type === "regulasi" ? "deleteRegulasi" : hapus.type === "kriteria" ? "deleteKriteria" : "deleteTabel";
    const data = await aksi(action, { id: hapus.id }, hapus.type === "regulasi" ? "Regulasi dihapus." : hapus.type === "kriteria" ? "Kriteria dihapus." : "Tabel dihapus.");
    setHapus(null);
    if (data) await fetchData();
  }

  if (!canManage) {
    return (
      <>
        <JudulHalaman judul="Struktur kriteria & tabel LKPS" />
        <Alert className="max-w-2xl">
          <ShieldAlert aria-hidden />
          <AlertTitle>Khusus Admin UPPS</AlertTitle>
          <AlertDescription>Struktur kriteria dan tabel LKPS hanya dapat diatur Admin UPPS (fakultas).</AlertDescription>
        </Alert>
      </>
    );
  }

  const ubahRegulasi = (p: Partial<typeof regulasiKosong>) => setRegulasiForm((f) => (f ? { ...f, ...p } : f));
  const ubahKriteria = (p: Partial<typeof kriteriaKosong>) => setKriteriaForm((f) => (f ? { ...f, ...p } : f));
  const ubahTabel = (p: Partial<typeof tabelKosong>) => setTabelForm((f) => (f ? { ...f, ...p } : f));

  const regulasiBaru = () => setRegulasiForm({
    ...regulasiKosong, nama: `Instrumen Akreditasi LAM Teknik ${new Date().getFullYear()}`,
    tahunAkademik: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, cloneFromId: currentRegulasi?.id || "",
  });

  return (
    <>
      <JudulHalaman
        judul="Struktur kriteria & tabel LKPS"
        deskripsi="Kriteria akreditasi, tabel LKPS, pembagian wewenang pengisian (UPPS/prodi), serta ketentuan kolom, bukti, dan rumus untuk seluruh fakultas."
        aksi={(
          <Button disabled={!currentRegulasi} onClick={() => {
            const n = kriteriaList.length + 1;
            setKriteriaForm({ ...kriteriaKosong, nomorUrut: n, kode: `Kriteria ${n}` });
          }}><Plus aria-hidden />Tambah kriteria</Button>
        )}
      />
      <Petunjuk
        kunci="lkps-konfigurasi"
        fungsi="Atur versi regulasi (instrumen per tahun), kriteria, dan tabel LKPS. Perubahan berlaku untuk semua program studi."
        langkah={[
          "Pilih versi regulasi, lalu jadikan aktif bila sudah siap dipakai prodi.",
          "Templat baku LAM Teknik mengisi 9 kriteria dan tabel bakunya ke regulasi yang dipilih.",
          "Kriteria atau tabel yang sudah diisi prodi tidak bisa dihapus; nonaktifkan lewat formulir ubah.",
        ]}
      />

      {loading ? <Skeleton className="h-40 w-full" /> : !currentRegulasi ? (
        <Alert>
          <FileStack aria-hidden />
          <AlertTitle>Belum ada versi regulasi</AlertTitle>
          <AlertDescription>
            <p>Buat versi instrumen pertama, lalu muat templat baku LAM Teknik.</p>
            <Button size="sm" className="mt-2" onClick={regulasiBaru}><Plus aria-hidden />Regulasi baru</Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3">
              <Field className="w-full max-w-md">
                <FieldLabel htmlFor="konf-regulasi">Versi regulasi</FieldLabel>
                <Select value={currentRegulasi.id} onValueChange={setSelectedRegulasiId}>
                  <SelectTrigger id="konf-regulasi" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {regulasiList.map((r) => <SelectItem key={r.id} value={r.id}>{r.nama} ({r.tahunAkademik}){r.statusAktif ? " · aktif" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Badge className={currentRegulasi.statusAktif ? "h-8 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "h-8"} variant={currentRegulasi.statusAktif ? "default" : "outline"}>
                {currentRegulasi.statusAktif ? "Dipakai seluruh prodi" : "Arsip / draf"}
              </Badge>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setTemplateOpen(true)}><Sparkles aria-hidden />Templat baku LAM Teknik</Button>
                <Button size="sm" variant="outline" onClick={regulasiBaru}><Plus aria-hidden />Regulasi baru</Button>
                {!currentRegulasi.statusAktif && (
                  <Button size="sm" variant="outline" disabled={saving} onClick={async () => { if (await aksi("setActiveRegulasi", { id: currentRegulasi.id }, "Regulasi aktif diubah.")) await fetchData(); }}>
                    <Star aria-hidden />Jadikan aktif
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setRegulasiForm({ ...regulasiKosong, id: currentRegulasi.id, nama: currentRegulasi.nama, tahunAkademik: currentRegulasi.tahunAkademik, keterangan: currentRegulasi.keterangan || "", statusAktif: currentRegulasi.statusAktif })}>
                  <Pencil aria-hidden />Ubah
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setHapus({ type: "regulasi", id: currentRegulasi.id, name: currentRegulasi.nama, subText: "Seluruh struktur kriteria dan tabel di dalamnya ikut terhapus." })}>
                  <Trash2 aria-hidden />Hapus
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <KotakKpi label="Kriteria" nilai={kriteriaList.length} nada="text-primary" />
            <KotakKpi label="Tabel LKPS" nilai={totalTabel} nada="text-violet-700 dark:text-violet-300" />
            <KotakKpi label="Tahun panduan" nilai={currentRegulasi.tahunAkademik} />
            <KotakKpi label="Wewenang UPPS" nilai={kriteriaList.filter((k) => k.levelWewenang === "UPPS").length} nada="text-blue-700 dark:text-blue-300" />
            <KotakKpi label="Wewenang prodi" nilai={kriteriaList.filter((k) => k.levelWewenang === "PRODI").length} nada="text-emerald-700 dark:text-emerald-300" />
            <KotakKpi label="Tabel wajib bukti PDF" nilai={totalBuktiWajib} nada="text-amber-700 dark:text-amber-300" />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  aria-label="Cari kriteria atau tabel" className="pr-9 pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kriteria, nomor tabel (mis. 3a1, 1.1), nama tabel, atau ketentuan"
                />
                {searchQuery && (
                  <Button size="icon" variant="ghost" className="absolute top-1/2 right-1 size-7 -translate-y-1/2" aria-label="Hapus pencarian" onClick={() => setSearchQuery("")}><X aria-hidden /></Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Wewenang:</span>
                {(["ALL", "UPPS", "PRODI", "BERSAMA"] as const).map((w) => (
                  <Button key={w} size="sm" variant={wewenangFilter === w ? "default" : "outline"} aria-pressed={wewenangFilter === w} onClick={() => setWewenangFilter(w)}>
                    {w === "ALL" ? "Semua" : w === "PRODI" ? "Prodi" : w === "BERSAMA" ? "Bersama" : "UPPS"}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lompat ke kriteria">
                <Button size="sm" variant={selectedKriteriaPill === "ALL" ? "default" : "ghost"} onClick={() => setSelectedKriteriaPill("ALL")}>Semua</Button>
                {kriteriaList.map((k) => (
                  <Button key={k.id} size="sm" variant={selectedKriteriaPill === k.id ? "default" : "ghost"} onClick={() => setSelectedKriteriaPill(k.id)}>{k.kode}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{filteredKriteriaList.length} kriteria</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => lipatSemua(false)}><ChevronsUpDown aria-hidden />Buka semua</Button>
              <Button size="sm" variant="outline" onClick={() => lipatSemua(true)}><ChevronsDownUp aria-hidden />Lipat semua</Button>
            </div>
          </div>

          {filteredKriteriaList.length === 0 && (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada kriteria yang cocok dengan pencarian atau saringan.</p>
          )}

          {filteredKriteriaList.map((k) => {
            const lipat = terlipat(k.id);
            return (
              <Card key={k.id} id={`kriteria-${k.id}`} className={cn("gap-0 py-0", !k.statusAktif && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={!lipat} aria-controls={`isi-${k.id}`}
                    onClick={() => setCollapsedKriteria((p) => ({ ...p, [k.id]: !lipat }))}
                  >
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !lipat && "rotate-180")} aria-hidden />
                    <IkonKriteria nomor={k.nomorUrut >= 1 && k.nomorUrut <= 9 ? k.nomorUrut : 0} besar="sm" />
                    <span className="min-w-0">
                      <span className="block font-medium">{k.kode}: {k.nama}</span>
                      {k.deskripsi && <span className="block truncate text-sm text-muted-foreground">{k.deskripsi}</span>}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={NADA_WEWENANG[k.levelWewenang]}>{k.levelWewenang}</Badge>
                    <Badge variant="outline">{k.tabelList?.length || 0} tabel</Badge>
                    {!k.statusAktif && <Badge variant="outline">Nonaktif</Badge>}
                    <Button asChild size="sm" variant="ghost"><Link href={alamatKriteria(k.nomorUrut, k.id)}><Eye aria-hidden />Buka halaman</Link></Button>
                    <Button size="icon" variant="ghost" aria-label={`Ubah ${k.kode}`} onClick={() => setKriteriaForm({ id: k.id, nomorUrut: k.nomorUrut, kode: k.kode, nama: k.nama, deskripsi: k.deskripsi || "", levelWewenang: k.levelWewenang, statusAktif: k.statusAktif })}><Pencil aria-hidden /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Hapus ${k.kode}`} onClick={() => setHapus({ type: "kriteria", id: k.id, name: `${k.kode}: ${k.nama}`, subText: `Seluruh ${k.tabelList?.length || 0} tabel di dalam kriteria ini ikut terhapus.` })}><Trash2 aria-hidden /></Button>
                    <Button size="sm" variant="outline" onClick={() => bukaTabel(k.id)}><Plus aria-hidden />Tabel</Button>
                  </div>
                </div>
                {!lipat && (
                  <div id={`isi-${k.id}`} className="overflow-x-auto border-t">
                    {(k.tabelList?.length ?? 0) === 0 ? (
                      <p className="px-6 py-4 text-sm text-muted-foreground">Belum ada tabel. Klik Tabel untuk menambahkan.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">Nomor & sheet</TableHead>
                            <TableHead>Nama tabel</TableHead>
                            <TableHead>Jenjang & waktu</TableHead>
                            <TableHead>Pengisi</TableHead>
                            <TableHead>Bukti</TableHead>
                            <TableHead className="pr-6 text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {k.tabelList.map((t) => {
                            const p = parseFormatKolom(t.formatKolom);
                            return (
                              <TableRow key={t.id} className={cn(!t.statusAktif && "opacity-60")}>
                                <TableCell className="pl-6">
                                  <div className="font-medium">{t.nomorTabel}</div>
                                  {p.sheetRef && <div className="font-mono text-xs text-muted-foreground">{p.sheetRef}</div>}
                                </TableCell>
                                <TableCell className="max-w-72 whitespace-normal">
                                  <div className="font-medium">{t.namaTabel}</div>
                                  {t.deskripsi && <div className="text-sm text-muted-foreground">{t.deskripsi}</div>}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div>{p.targetJenjang || "Semua Jenjang"}</div>
                                  <div className="text-muted-foreground">{p.konvensiWaktu || "TS-2 s.d. TS"}</div>
                                </TableCell>
                                <TableCell><Badge className={NADA_WEWENANG[t.levelPengisi]}>{t.levelPengisi}</Badge></TableCell>
                                <TableCell>
                                  {t.wajibUploadBukti
                                    ? <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300">Wajib PDF</Badge>
                                    : <Badge variant="outline">Opsional</Badge>}
                                </TableCell>
                                <TableCell className="pr-6 text-right whitespace-nowrap">
                                  <Button size="icon" variant="ghost" aria-label={`Ketentuan ${t.nomorTabel}`} onClick={() => setKetentuan({ tabel: t, kriteria: k, ketentuan: p })}><Eye aria-hidden /></Button>
                                  <Button size="icon" variant="ghost" aria-label={`Ubah ${t.nomorTabel}`} onClick={() => bukaTabel(k.id, t)}><Pencil aria-hidden /></Button>
                                  <Button size="icon" variant="ghost" aria-label={`Hapus ${t.nomorTabel}`} onClick={() => setHapus({ type: "tabel", id: t.id, name: `Tabel ${t.nomorTabel}: ${t.namaTabel}`, subText: "Tabel instrumen ini dihapus dari kriteria." })}><Trash2 aria-hidden /></Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}

      {/* ─── Regulasi ─── */}
      <Dialog open={Boolean(regulasiForm)} onOpenChange={(b) => !b && setRegulasiForm(null)}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={(e) => void simpanRegulasi(e)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{regulasiForm?.id ? "Ubah regulasi" : "Regulasi / tahun baru"}</DialogTitle>
              <DialogDescription>Satu regulasi = satu versi instrumen akreditasi per tahun akademik.</DialogDescription>
            </DialogHeader>
            {regulasiForm && (
              <FieldGroup>
                <Field><FieldLabel htmlFor="reg-nama">Nama regulasi / instrumen</FieldLabel><Input id="reg-nama" required value={regulasiForm.nama} placeholder="Contoh: Instrumen LAM Teknik 2024 (Diploma III / Sarjana Terapan)" onChange={(e) => ubahRegulasi({ nama: e.target.value })} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field><FieldLabel htmlFor="reg-tahun">Tahun akademik</FieldLabel><Input id="reg-tahun" required value={regulasiForm.tahunAkademik} placeholder="2024/2025" onChange={(e) => ubahRegulasi({ tahunAkademik: e.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="reg-status">Status acuan</FieldLabel><PilihanBenar id="reg-status" value={regulasiForm.statusAktif} onChange={(v) => ubahRegulasi({ statusAktif: v })} ya="Jadikan regulasi aktif" tidak="Simpan sebagai draf/arsip" /></Field>
                </div>
                {!regulasiForm.id && (
                  <Field>
                    <FieldLabel htmlFor="reg-salin">Salin struktur dari versi</FieldLabel>
                    <Select value={regulasiForm.cloneFromId || "kosong"} onValueChange={(v) => ubahRegulasi({ cloneFromId: v === "kosong" ? "" : v })}>
                      <SelectTrigger id="reg-salin" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kosong">Buat dari kosong</SelectItem>
                        {regulasiList.map((r) => <SelectItem key={r.id} value={r.id}>{r.nama} ({r.tahunAkademik})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field><FieldLabel htmlFor="reg-ket">Catatan / keterangan</FieldLabel><Textarea id="reg-ket" rows={2} value={regulasiForm.keterangan} placeholder="Keterangan SK atau catatan perubahan aturan LAM Teknik" onChange={(e) => ubahRegulasi({ keterangan: e.target.value })} /></Field>
              </FieldGroup>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRegulasiForm(null)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Kriteria ─── */}
      <Dialog open={Boolean(kriteriaForm)} onOpenChange={(b) => !b && setKriteriaForm(null)}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={(e) => void simpanKriteria(e)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{kriteriaForm?.id ? "Ubah kriteria" : "Tambah kriteria"}</DialogTitle>
              <DialogDescription>{currentRegulasi ? `${currentRegulasi.nama} (${currentRegulasi.tahunAkademik})` : ""}</DialogDescription>
            </DialogHeader>
            {kriteriaForm && (
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-[6rem_1fr_1fr]">
                  <Field><FieldLabel htmlFor="kr-no">No. urut</FieldLabel><Input id="kr-no" type="number" required value={kriteriaForm.nomorUrut} onChange={(e) => ubahKriteria({ nomorUrut: parseInt(e.target.value) || 0 })} /></Field>
                  <Field><FieldLabel htmlFor="kr-kode">Kode</FieldLabel><Input id="kr-kode" required value={kriteriaForm.kode} placeholder="Kriteria 1 atau K1" onChange={(e) => ubahKriteria({ kode: e.target.value })} /></Field>
                  <Field>
                    <FieldLabel htmlFor="kr-wewenang">Wewenang</FieldLabel>
                    <Select value={kriteriaForm.levelWewenang} onValueChange={(v) => ubahKriteria({ levelWewenang: v })}>
                      <SelectTrigger id="kr-wewenang" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPPS">UPPS (fakultas)</SelectItem>
                        <SelectItem value="PRODI">Prodi</SelectItem>
                        <SelectItem value="BERSAMA">Bersama (UPPS & prodi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field><FieldLabel htmlFor="kr-nama">Nama kriteria</FieldLabel><Input id="kr-nama" required value={kriteriaForm.nama} placeholder="Contoh: Tata Pamong, Tata Kelola & Kerjasama" onChange={(e) => ubahKriteria({ nama: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="kr-desk">Deskripsi lingkup</FieldLabel><Textarea id="kr-desk" rows={3} value={kriteriaForm.deskripsi} onChange={(e) => ubahKriteria({ deskripsi: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="kr-status">Status</FieldLabel><PilihanBenar id="kr-status" value={kriteriaForm.statusAktif} onChange={(v) => ubahKriteria({ statusAktif: v })} ya="Aktif (tampil dalam instrumen)" tidak="Nonaktif (disembunyikan)" /></Field>
              </FieldGroup>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setKriteriaForm(null)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Tabel ─── */}
      <Dialog open={Boolean(tabelForm)} onOpenChange={(b) => !b && setTabelForm(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={(e) => void simpanTabel(e)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{tabelForm?.id ? "Ubah tabel LKPS" : "Tambah tabel LKPS"}</DialogTitle>
              <DialogDescription>Identitas tabel, sasaran dan waktu, serta ketentuan kolom, bukti, dan rumus.</DialogDescription>
            </DialogHeader>
            {tabelForm && (
              <FieldGroup>
                <FieldSet>
                  <FieldLegend variant="label">1. Identitas dan penanggung jawab</FieldLegend>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field><FieldLabel htmlFor="tb-no">Nomor tabel</FieldLabel><Input id="tb-no" required value={tabelForm.nomorTabel} placeholder="1.1 / 2.a" onChange={(e) => ubahTabel({ nomorTabel: e.target.value })} /></Field>
                    <Field><FieldLabel htmlFor="tb-sheet">Sheet LKPS</FieldLabel><Input id="tb-sheet" value={tabelForm.sheetRef} placeholder="1-1, 2a1, 3a1" onChange={(e) => ubahTabel({ sheetRef: e.target.value })} /></Field>
                    <Field>
                      <FieldLabel htmlFor="tb-pengisi">Pengisi</FieldLabel>
                      <Select value={tabelForm.levelPengisi} onValueChange={(v) => ubahTabel({ levelPengisi: v })}>
                        <SelectTrigger id="tb-pengisi" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="PRODI">Tim Prodi</SelectItem><SelectItem value="UPPS">Admin UPPS</SelectItem></SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field><FieldLabel htmlFor="tb-nama">Nama tabel</FieldLabel><Input id="tb-nama" required value={tabelForm.namaTabel} placeholder="Contoh: Kerjasama bidang pendidikan" onChange={(e) => ubahTabel({ namaTabel: e.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="tb-desk">Deskripsi dan petunjuk pengisian</FieldLabel><Textarea id="tb-desk" rows={2} value={tabelForm.deskripsi} onChange={(e) => ubahTabel({ deskripsi: e.target.value })} /></Field>
                </FieldSet>
                <FieldSet>
                  <FieldLegend variant="label">2. Sasaran dan konvensi waktu</FieldLegend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="tb-jenjang">Target jenjang</FieldLabel>
                      <Select value={tabelForm.targetJenjang} onValueChange={(v) => ubahTabel({ targetJenjang: v })}>
                        <SelectTrigger id="tb-jenjang" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{JENJANG.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tb-waktu">Konvensi waktu</FieldLabel>
                      <Select value={tabelForm.konvensiWaktu} onValueChange={(v) => ubahTabel({ konvensiWaktu: v })}>
                        <SelectTrigger id="tb-waktu" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{WAKTU.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field><FieldLabel htmlFor="tb-bukti">Unggah bukti PDF</FieldLabel><PilihanBenar id="tb-bukti" value={tabelForm.wajibUploadBukti} onChange={(v) => ubahTabel({ wajibUploadBukti: v })} ya="Wajib" tidak="Opsional (jika ada)" /></Field>
                    <Field><FieldLabel htmlFor="tb-status">Status tabel</FieldLabel><PilihanBenar id="tb-status" value={tabelForm.statusAktif} onChange={(v) => ubahTabel({ statusAktif: v })} ya="Aktif" tidak="Nonaktif (arsip)" /></Field>
                  </div>
                </FieldSet>
                <FieldSet>
                  <FieldLegend variant="label">3. Ketentuan kolom, bukti, dan rumus</FieldLegend>
                  <Field><FieldLabel htmlFor="tb-kolom">Daftar kolom data utama</FieldLabel><Textarea id="tb-kolom" rows={2} value={tabelForm.kolomInput} placeholder="Contoh: Lembaga mitra, Tingkat, Judul kegiatan, Manfaat bagi PS (pisahkan dengan koma)" onChange={(e) => ubahTabel({ kolomInput: e.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="tb-dok">Dokumen bukti sahih yang disyaratkan</FieldLabel><Textarea id="tb-dok" rows={2} value={tabelForm.dokumenBukti} placeholder="Contoh: MoU/MoA bertanda tangan pimpinan, SK Dekan" onChange={(e) => ubahTabel({ dokumenBukti: e.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="tb-rumus">Rumus / indikator penilaian LAM Teknik</FieldLabel><Textarea id="tb-rumus" rows={2} value={tabelForm.rumusPenilaian} placeholder="Contoh: RK = (2×N1 + 1×N2 + 3×N3) / NDTPS" onChange={(e) => ubahTabel({ rumusPenilaian: e.target.value })} /></Field>
                </FieldSet>
              </FieldGroup>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTabelForm(null)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Detail ketentuan ─── */}
      <Dialog open={Boolean(ketentuan)} onOpenChange={(b) => !b && setKetentuan(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          {ketentuan && (
            <>
              <DialogHeader>
                <DialogTitle>Tabel {ketentuan.tabel.nomorTabel}: {ketentuan.tabel.namaTabel}</DialogTitle>
                <DialogDescription>{ketentuan.kriteria.kode}: {ketentuan.kriteria.nama}</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Penanggung jawab", ketentuan.tabel.levelPengisi],
                  ["Target jenjang", ketentuan.ketentuan.targetJenjang || "Semua Jenjang"],
                  ["Konvensi waktu", ketentuan.ketentuan.konvensiWaktu || "TS-2 s.d. TS"],
                  ["Kewajiban bukti sahih", ketentuan.tabel.wajibUploadBukti ? "Wajib unggah PDF" : "Opsional"],
                ].map(([l, v]) => <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-medium">{v}</dd></div>)}
              </dl>
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <div className="mb-1 font-medium">Kolom yang wajib dilaporkan</div>
                  {daftarKolom(ketentuan.ketentuan.kolom).length
                    ? <div className="flex flex-wrap gap-1.5">{daftarKolom(ketentuan.ketentuan.kolom).map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
                    : <span className="text-muted-foreground">Belum ditentukan.</span>}
                </div>
                <div><div className="mb-1 font-medium">Dokumen bukti sahih</div><p className="text-muted-foreground">{ketentuan.ketentuan.dokumenBukti || "Belum ditentukan."}</p></div>
                <div><div className="mb-1 font-medium">Rumus / indikator penilaian</div><p className="rounded-md border bg-muted/40 px-3 py-2 font-mono">{ketentuan.ketentuan.rumusPenilaian || "Belum ditentukan."}</p></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setKetentuan(null)}>Tutup</Button>
                <Button onClick={() => { const k = ketentuan; setKetentuan(null); bukaTabel(k.kriteria.id, k.tabel); }}><Pencil aria-hidden />Ubah ketentuan</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Templat baku ─── */}
      <AlertDialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Muat templat baku LAM Teknik?</AlertDialogTitle>
            <AlertDialogDescription>
              9 kriteria akreditasi dan seluruh tabel LKPS baku LAM Teknik dimuat ke {currentRegulasi ? `${currentRegulasi.nama} (${currentRegulasi.tahunAkademik})` : "regulasi terpilih"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={replaceExistingTemplate} onCheckedChange={(v) => setReplaceExistingTemplate(v === true)} className="mt-0.5" />
            Gantikan seluruh kriteria yang ada pada regulasi ini (kriteria yang sudah diisi prodi tidak bisa diganti).
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !currentRegulasi}
              onClick={async () => {
                if (!currentRegulasi) return;
                if (await aksi("loadTemplateLAMTeknik", { regulasiId: currentRegulasi.id, replaceExisting: replaceExistingTemplate }, "Templat baku LAM Teknik dimuat.")) await fetchData();
              }}
            >
              Muat templat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Konfirmasi hapus ─── */}
      <AlertDialog open={Boolean(hapus)} onOpenChange={(b) => !b && setHapus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {hapus?.name}?</AlertDialogTitle>
            <AlertDialogDescription>{hapus?.subText} Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={saving} onClick={() => void jalankanHapus()}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
