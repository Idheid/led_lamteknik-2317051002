"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/sdm/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }, peran dari kerangka LED (isian ditulis Tim Prodi).
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Tabs, Table, Dialog, Field, Input, Select, Badge, AlertDialog,
// toast). Indikator (PDTT, S3, serdos, serkom, rata-rata EWMP, tendik), kolom tabel 3.a.1–3.c, aksi API, dan saringan
// kategori 3.b tidak berubah. Perbedaan:
// - formulir "Tambah" tidak lagi terisi contoh data (kode asal: prodi pasca, bidang keahlian, MK, beban 12, bimbingan
//   4/5/4, EWMP 6/2/3/2/1) karena contoh itu bisa ikut tersimpan; contoh menjadi placeholder;
// - kategori bawaan luaran per sub-tab memakai nilai yang ada di daftar pilihan (kode asal memakai label yang tidak
//   ada di daftar, sehingga pilihan tampak kosong);
// - pesan "tambahkan dosen tetap dulu" memakai toast, hapus memakai dialog konfirmasi.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Award, Check, Clock, GraduationCap, Pencil, Plus, UserCheck, Users, X } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleNotice from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import { Angka, BarisAngka, KartuHitung, KartuTabel, KosongArahan, TombolHapus } from "@/modules/lkps/komponen/bersama/ui-lkps";

// ─── Tipe ─────────────────────────────────────────────────────

interface DosenRow {
  id: string;
  nama: string;
  nidn: string;
  pendidikanS2: boolean;
  pendidikanS3: boolean;
  prodiPascaS2?: string | null;
  prodiPascaS3?: string | null;
  bidangKeahlian: string;
  kesesuaianKompetensi?: boolean;
  jabatanAkademik: string;
  sertifikasiDosen: boolean;
  noSertifikatPendidik?: string | null;
  sertifikasiKompetensi: boolean;
  bidangSertifikasi?: string | null;
  lembagaSertifikasi?: string | null;
  mataKuliahDiampu: string;
  kesesuaianBidang: boolean;
  mataKuliahPSLain?: string | null;
  bebanMengajar: number;
}

interface BimbinganRow {
  id: string;
  dosenId: string;
  dosen?: { nama: string };
  bimbinganPSSendiriTS: number;
  bimbinganPSSendiriTS1: number;
  bimbinganPSSendiriTS2: number;
  bimbinganPSLainTS: number;
  bimbinganPSLainTS1: number;
  bimbinganPSLainTS2: number;
}

interface EwmpRow {
  id: string;
  dosenId: string;
  dosen?: { nama: string };
  sksPendidikanPSSendiri: number;
  sksPendidikanPSLain: number;
  sksPenelitian: number;
  sksPkm: number;
  sksTugasTambahan: number;
}

interface LuaranDosenRow {
  id: string;
  dosenId?: string | null;
  namaDosen?: string | null;
  dosen?: { nama: string };
  jenis: string;
  judul: string;
  tahun: number;
  detail: string | null;
}

interface TendikRow {
  id: string;
  jenis: string;
  jenjangPendidikan: string;
  jumlah: number;
}

type SubTab3b = "semua" | "3b1" | "3b4" | "3b6" | "3b7" | "3b8";

const JABATAN = ["Asisten Ahli", "Lektor", "Lektor Kepala", "Guru Besar"];
const JENIS_TENDIK = ["Pustakawan", "Laboran", "Teknisi", "Administrasi"];
const JENJANG_TENDIK = ["SMA/SMK", "D3", "S1", "S2", "S3"];

const KATEGORI_LUARAN: { grup: string; pilihan: [string, string][] }[] = [
  { grup: "3.b.1 Rekognisi", pilihan: [
    ["Rekognisi - Visiting Lecturer / Scholar", "Visiting Lecturer / Visiting Scholar"],
    ["Rekognisi - Keynote / Invited Speaker", "Keynote Speaker / Invited Speaker"],
    ["Rekognisi - Editor / Mitra Bestari Jurnal", "Editor / Mitra Bestari Jurnal Bereputasi"],
    ["Rekognisi - Staf Ahli / Narasumber", "Staf Ahli / Konsultan / Narasumber Lembaga"],
    ["Rekognisi - Penghargaan Prestasi / Kinerja", "Penghargaan atas Prestasi / Kinerja"],
  ] },
  { grup: "3.b.4 Publikasi ilmiah", pilihan: [
    ["Publikasi - Jurnal Nasional Tidak Terakreditasi", "Jurnal Nasional Tidak Terakreditasi"],
    ["Publikasi - Jurnal Nasional Terakreditasi (SINTA)", "Jurnal Nasional Terakreditasi (SINTA)"],
    ["Publikasi - Jurnal Internasional", "Jurnal Internasional"],
    ["Publikasi - Jurnal Internasional Bereputasi", "Jurnal Internasional Bereputasi (Scopus/WoS)"],
    ["Publikasi - Seminar Wilayah / Lokal", "Seminar Wilayah / Lokal / PT"],
    ["Publikasi - Seminar Nasional", "Seminar Nasional"],
    ["Publikasi - Seminar Internasional", "Seminar Internasional / Prosiding Terindeks"],
    ["Publikasi - Media Massa Nasional / Internasional", "Tulisan di Media Massa Nasional / Internasional"],
  ] },
  { grup: "3.b.6 Sitasi", pilihan: [["Sitasi - Artikel Ilmiah DTPS", "Artikel Ilmiah yang Disitasi dalam 3 Tahun Terakhir"]] },
  { grup: "3.b.7 Produk/jasa", pilihan: [["Produk/Jasa - Diadopsi Industri / Masyarakat", "Produk / Jasa yang Diadopsi Industri / Masyarakat"]] },
  { grup: "3.b.8 HKI dan buku", pilihan: [
    ["HKI - Paten / Paten Sederhana", "HKI Bagian 1: Paten / Paten Sederhana (Granted)"],
    ["HKI - Hak Cipta / Desain Industri", "HKI Bagian 2: Hak Cipta / Desain Produk Industri"],
    ["Teknologi Tepat Guna / Desain / Rekayasa", "Teknologi Tepat Guna / Desain Produk / Rekayasa Sosial"],
    ["Buku Ber-ISBN / Book Chapter", "Buku Ber-ISBN / Book Chapter Penerbit Terakreditasi"],
  ] },
];

const SUB_3B: { id: SubTab3b; label: string; bawaan: string }[] = [
  { id: "semua", label: "Semua kategori", bawaan: "Publikasi - Jurnal Nasional Terakreditasi (SINTA)" },
  { id: "3b1", label: "3.b.1 Rekognisi DTPS", bawaan: "Rekognisi - Staf Ahli / Narasumber" },
  { id: "3b4", label: "3.b.4 Publikasi ilmiah", bawaan: "Publikasi - Jurnal Nasional Terakreditasi (SINTA)" },
  { id: "3b6", label: "3.b.6 Sitasi karya", bawaan: "Sitasi - Artikel Ilmiah DTPS" },
  { id: "3b7", label: "3.b.7 Produk industri", bawaan: "Produk/Jasa - Diadopsi Industri / Masyarakat" },
  { id: "3b8", label: "3.b.8 HKI & buku", bawaan: "HKI - Paten / Paten Sederhana" },
];

/** Saringan kategori 3.b (kode asal, tanpa perubahan). */
function cocokSub(sub: SubTab3b, jenis: string): boolean {
  if (sub === "semua") return true;
  if (sub === "3b1") return jenis.includes("Rekognisi") || jenis.includes("Staf Ahli") || jenis.includes("Visiting");
  if (sub === "3b4") return jenis.includes("Jurnal") || jenis.includes("Prosiding") || jenis.includes("Publikasi");
  if (sub === "3b6") return jenis.includes("Sitasi");
  if (sub === "3b7") return jenis.includes("Produk") || jenis.includes("Jasa") || jenis.includes("Industri");
  return jenis.includes("Paten") || jenis.includes("Hak Cipta") || jenis.includes("HKI") || jenis.includes("Buku");
}

/** Label isian luaran menurut kategori (kode asal). */
function labelLuaran(jenis: string): [string, string, string] {
  if (jenis.includes("Rekognisi")) return ["Bentuk rekognisi / nama kegiatan", "Tahun pelaksanaan", "Tingkat & bukti sahih (SK/sertifikat/tautan)"];
  if (jenis.includes("Sitasi")) return ["Judul artikel yang disitasi", "Tahun publikasi artikel", "Nama jurnal, volume, nomor & jumlah sitasi"];
  if (jenis.includes("Produk") || jenis.includes("Jasa")) return ["Nama produk / jasa yang diadopsi", "Tahun adopsi", "Industri / mitra pengadopsi & bukti sahih"];
  if (jenis.includes("HKI") || jenis.includes("Paten") || jenis.includes("Buku")) return ["Judul luaran HKI / paten / judul buku", "Tahun perolehan / terbit", "Nomor paten / sertifikat HKI / ISBN buku"];
  return ["Judul artikel / makalah publikasi ilmiah", "Tahun terbit", "Nama jurnal / prosiding, volume & tautan DOI"];
}

const tempId = () => `temp_${Date.now()}`;

function Sesuai({ ya }: { ya: boolean }) {
  return ya
    ? <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Check aria-hidden />Sesuai</Badge>
    : <Badge className="bg-destructive/10 text-destructive"><X aria-hidden />Tidak</Badge>;
}

function PilihDosen({ id, value, onChange, dosen, kosong }: { id: string; value: string; onChange: (v: string) => void; dosen: DosenRow[]; kosong?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full"><SelectValue placeholder={kosong ?? "Pilih dosen tetap"} /></SelectTrigger>
      <SelectContent>{dosen.map((d) => <SelectItem key={d.id} value={d.id}>{d.nama} ({d.nidn})</SelectItem>)}</SelectContent>
    </Select>
  );
}

function IsianTeks({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string | null | undefined; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function IsianAngka({ id, label, value, onChange, desimal }: { id: string; label: string; value: number; onChange: (v: number) => void; desimal?: boolean }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id} type="number" min={0} step={desimal ? 0.5 : 1} value={value}
        onChange={(e) => onChange((desimal ? parseFloat(e.target.value) : parseInt(e.target.value)) || 0)}
      />
    </Field>
  );
}

function DialogIsian({
  buka, onTutup, judul, deskripsi, sibuk, onSimpan, lebar, children,
}: { buka: boolean; onTutup: () => void; judul: string; deskripsi?: string; sibuk: boolean; onSimpan: () => void; lebar?: string; children: ReactNode }) {
  return (
    <Dialog open={buka} onOpenChange={(b) => !b && onTutup()}>
      <DialogContent className={`max-h-[90svh] overflow-y-auto ${lebar ?? "sm:max-w-xl"}`}>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          {deskripsi && <DialogDescription>{deskripsi}</DialogDescription>}
        </DialogHeader>
        <FieldGroup>{children}</FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onTutup}>Batal</Button>
          <Button onClick={onSimpan} disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Komponen ─────────────────────────────────────────────────

export default function HalamanSdm() {
  const { peran } = useInfoLkps();
  const canEdit = peran === "TIM_PRODI";
  const [subTab3b, setSubTab3b] = useState<SubTab3b>("semua");
  const [dosenList, setDosenList] = useState<DosenRow[]>([]);
  const [bimbinganList, setBimbinganList] = useState<BimbinganRow[]>([]);
  const [ewmpList, setEwmpList] = useState<EwmpRow[]>([]);
  const [luaranList, setLuaranList] = useState<LuaranDosenRow[]>([]);
  const [tendikList, setTendikList] = useState<TendikRow[]>([]);
  const [editingDosen, setEditingDosen] = useState<DosenRow | null>(null);
  const [editingBimbingan, setEditingBimbingan] = useState<BimbinganRow | null>(null);
  const [editingEwmp, setEditingEwmp] = useState<EwmpRow | null>(null);
  const [editingLuaran, setEditingLuaran] = useState<LuaranDosenRow | null>(null);
  const [editingTendik, setEditingTendik] = useState<TendikRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await kirimLkps("/api/lkps/sdm");
      if (res.ok) {
        const data = await res.json();
        setDosenList(data.dosen || []);
        setBimbinganList(data.bimbingan || []);
        setEwmpList(data.ewmp || []);
        setLuaranList(data.luaranDosen || []);
        setTendikList(data.tendik || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ─── Indikator (kode asal, tanpa perubahan) ────────────────
  const ndt = dosenList.length;
  const ndtt = 0;
  const pdtt = ndt + ndtt > 0 ? (ndtt / (ndt + ndtt)) * 100 : 0;
  const totalS3 = dosenList.filter((d) => d.pendidikanS3).length;
  const totalSerkom = dosenList.filter((d) => d.sertifikasiKompetensi).length;
  const totalSerdos = dosenList.filter((d) => d.sertifikasiDosen).length;
  const totalEwmp = (e: EwmpRow) => e.sksPendidikanPSSendiri + e.sksPendidikanPSLain + e.sksPenelitian + e.sksPkm + e.sksTugasTambahan;
  const avgEwmp = ewmpList.length > 0 ? ewmpList.reduce((a, e) => a + totalEwmp(e), 0) / ewmpList.length : 0;
  const namaDosenDari = (id: string, rel?: { nama: string }) => rel?.nama || dosenList.find((d) => d.id === id)?.nama || "–";

  /** Kirim satu aksi sdm; sukses → muat ulang, tutup dialog, toast. */
  async function aksi(action: string, payload: unknown, sukses: string, tutup?: () => void) {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/sdm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        await fetchData();
        tutup?.();
        toast.success(sukses);
      }
    } finally {
      setSaving(false);
    }
  }

  const perluDosen = () => {
    if (dosenList.length > 0) return false;
    toast.error("Tambahkan dosen tetap terlebih dahulu di tab Tabel 3.a.1.");
    return true;
  };

  const tambahDosen = () => setEditingDosen({
    id: tempId(), nama: "", nidn: "", pendidikanS2: false, pendidikanS3: false, prodiPascaS2: "", prodiPascaS3: "", bidangKeahlian: "",
    kesesuaianKompetensi: true, jabatanAkademik: "Lektor", sertifikasiDosen: false, noSertifikatPendidik: "", sertifikasiKompetensi: false,
    bidangSertifikasi: "", lembagaSertifikasi: "", mataKuliahDiampu: "", kesesuaianBidang: true, mataKuliahPSLain: "", bebanMengajar: 0,
  });
  const tambahBimbingan = () => {
    if (perluDosen()) return;
    setEditingBimbingan({
      id: tempId(), dosenId: dosenList[0]?.id || "", bimbinganPSSendiriTS: 0, bimbinganPSSendiriTS1: 0, bimbinganPSSendiriTS2: 0,
      bimbinganPSLainTS: 0, bimbinganPSLainTS1: 0, bimbinganPSLainTS2: 0,
    });
  };
  const tambahEwmp = () => {
    if (perluDosen()) return;
    setEditingEwmp({ id: tempId(), dosenId: dosenList[0]?.id || "", sksPendidikanPSSendiri: 0, sksPendidikanPSLain: 0, sksPenelitian: 0, sksPkm: 0, sksTugasTambahan: 0 });
  };
  const tambahLuaran = () => setEditingLuaran({
    id: tempId(), dosenId: dosenList[0]?.id || "", namaDosen: dosenList[0]?.nama || "",
    jenis: SUB_3B.find((s) => s.id === subTab3b)!.bawaan, judul: "", tahun: new Date().getFullYear(), detail: "",
  });
  const tambahTendik = () => setEditingTendik({ id: tempId(), jenis: "Laboran", jenjangPendidikan: "S1", jumlah: 1 });

  const ubahDosen = (p: Partial<DosenRow>) => setEditingDosen((d) => (d ? { ...d, ...p } : d));
  const ubahBimbingan = (p: Partial<BimbinganRow>) => setEditingBimbingan((d) => (d ? { ...d, ...p } : d));
  const ubahEwmp = (p: Partial<EwmpRow>) => setEditingEwmp((d) => (d ? { ...d, ...p } : d));
  const ubahLuaran = (p: Partial<LuaranDosenRow>) => setEditingLuaran((d) => (d ? { ...d, ...p } : d));
  const ubahTendik = (p: Partial<TendikRow>) => setEditingTendik((d) => (d ? { ...d, ...p } : d));

  const luaranTampil = luaranList.filter((l) => cocokSub(subTab3b, l.jenis));
  const tombolTambah = (label: string, onClick: () => void) => canEdit && <Button onClick={onClick}><Plus aria-hidden />{label}</Button>;
  const kosong = (judul: string, arahan: string) => (
    <KosongArahan nomor={3} judul={loading ? "Memuat data…" : judul}>{!loading && (canEdit ? arahan : "Tim Prodi belum mengisi tabel ini.")}</KosongArahan>
  );
  const aksiBaris = (onUbah: () => void, judulHapus: string, onHapus: () => void, nama: string) => canEdit && (
    <TableCell className="pr-6 text-right whitespace-nowrap">
      <Button size="icon" variant="ghost" aria-label={`Ubah ${nama}`} onClick={onUbah}><Pencil aria-hidden /></Button>
      <TombolHapus label={`Hapus ${nama}`} judul={judulHapus} deskripsi={nama} onHapus={onHapus} />
    </TableCell>
  );

  const [lblJudul, lblTahun, lblDetail] = labelLuaran(editingLuaran?.jenis ?? "");

  return (
    <>
      <JudulHalaman
        judul="Kriteria 3: Sumber Daya Manusia (SDM)"
        deskripsi="Tabel 3.a.1 sampai 3.c LKPS: dosen tetap, pembimbing TA, EWMP, kinerja dan luaran dosen, tenaga kependidikan."
      />
      <RoleNotice module="sdm" />

      <KartuHitung
        judul="Indikator SDM dosen"
        deskripsi="Dihitung langsung dari tabel di bawah: persentase dosen, sertifikasi, dan rata-rata EWMP."
        skor={<Badge className="h-7 px-2.5 text-sm">Total DTPS: {dosenList.length} dosen</Badge>}
        rumus={<>Persentase Dosen Tidak Tetap (PDTT) = NDTT / (NDT + NDTT) × 100% = <strong>{pdtt.toFixed(2)}%</strong></>}
      >
        <BarisAngka>
          <Angka label="Dosen S3 (doktor)" nilai={totalS3} nada="text-violet-700 dark:text-violet-300" />
          <Angka label="Sertifikat pendidik" nilai={totalSerdos} nada="text-emerald-700 dark:text-emerald-300" />
          <Angka label="Sertifikat kompetensi/profesi" nilai={totalSerkom} nada="text-amber-700 dark:text-amber-300" />
          <Angka label="Rata-rata EWMP (SKS/semester)" nilai={avgEwmp.toFixed(1)} nada="text-blue-700 dark:text-blue-300" />
          <Angka label="Tenaga kependidikan" nilai={tendikList.reduce((a, t) => a + t.jumlah, 0)} />
        </BarisAngka>
      </KartuHitung>

      <Tabs defaultValue="3a1" className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="3a1"><UserCheck aria-hidden />3.a.1 Profil DTPS</TabsTrigger>
          <TabsTrigger value="3a2"><GraduationCap aria-hidden />3.a.2 Pembimbing TA</TabsTrigger>
          <TabsTrigger value="3a3"><Clock aria-hidden />3.a.3 EWMP</TabsTrigger>
          <TabsTrigger value="3b"><Award aria-hidden />3.b Kinerja & luaran</TabsTrigger>
          <TabsTrigger value="3c"><Users aria-hidden />3.c Tenaga kependidikan</TabsTrigger>
        </TabsList>

        {/* ─── 3.a.1 Dosen tetap ─── */}
        <TabsContent value="3a1">
          <KartuTabel
            nomor={3} judul="Tabel 3.a.1 · Profil dosen tetap PS (DTPS)"
            deskripsi="Nama, NIDN, pendidikan, sertifikasi, jabatan akademik, dan kesesuaian keahlian."
            aksi={tombolTambah("Tambah dosen tetap", tambahDosen)}
          >
            {dosenList.length === 0 ? kosong("Belum ada data dosen tetap", "Klik Tambah dosen tetap untuk mengisi data DTPS.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="pl-6 align-bottom">No</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Nama dosen</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">NIDN/NIDK</TableHead>
                    <TableHead colSpan={2} className="text-center">Prodi pascasarjana</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Bidang keahlian</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Kesesuaian kompetensi inti</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Jabatan akademik</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">No. sertifikat pendidik</TableHead>
                    <TableHead colSpan={2} className="text-center">Sertifikat profesi/kompetensi</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">MK diampu di PS</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Kesesuaian dengan MK</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">MK di PS lain</TableHead>
                    {canEdit && <TableHead rowSpan={2} className="pr-6 text-right align-bottom">Aksi</TableHead>}
                  </TableRow>
                  <TableRow>
                    <TableHead>Magister (S2)</TableHead>
                    <TableHead>Doktor (S3)</TableHead>
                    <TableHead>Bidang</TableHead>
                    <TableHead>Lembaga penerbit</TableHead>
                  </TableRow>
                  <TableRow className="text-xs text-muted-foreground">
                    {["1", "2", "3", "4", "", "5", "6", "7", "8", "9", "10", "11", "12", "13"].map((n, i) => (
                      <TableHead key={i} className={i === 0 ? "pl-6 font-normal" : "font-normal"}>{n}</TableHead>
                    ))}
                    {canEdit && <TableHead className="pr-6" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dosenList.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{d.nama}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{d.nidn}</TableCell>
                      <TableCell>{d.prodiPascaS2 || (d.pendidikanS2 ? "Magister (S2)" : "–")}</TableCell>
                      <TableCell>{d.prodiPascaS3 || (d.pendidikanS3 ? "Doktor (S3)" : "–")}</TableCell>
                      <TableCell>{d.bidangKeahlian || "–"}</TableCell>
                      <TableCell><Sesuai ya={d.kesesuaianKompetensi ?? true} /></TableCell>
                      <TableCell className="whitespace-nowrap">{d.jabatanAkademik}</TableCell>
                      <TableCell>{d.noSertifikatPendidik || (d.sertifikasiDosen ? "Terverifikasi" : "–")}</TableCell>
                      <TableCell>{d.bidangSertifikasi || (d.sertifikasiKompetensi ? "Kompetensi industri" : "–")}</TableCell>
                      <TableCell>{d.lembagaSertifikasi || "–"}</TableCell>
                      <TableCell className="max-w-48 truncate" title={d.mataKuliahDiampu}>{d.mataKuliahDiampu || "–"}</TableCell>
                      <TableCell><Sesuai ya={d.kesesuaianBidang} /></TableCell>
                      <TableCell className="max-w-40 truncate" title={d.mataKuliahPSLain ?? ""}>{d.mataKuliahPSLain || "–"}</TableCell>
                      {aksiBaris(() => setEditingDosen({ ...d }), "Hapus data dosen tetap ini?", () => void aksi("deleteDosen", { id: d.id }, "Dosen tetap dihapus."), d.nama)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>

        {/* ─── 3.a.2 Bimbingan TA ─── */}
        <TabsContent value="3a2">
          <KartuTabel
            nomor={3} judul="Tabel 3.a.2 · Dosen pembimbing utama tugas akhir"
            deskripsi="Jumlah mahasiswa bimbingan di PS sendiri dan PS lain (TS-2, TS-1, TS)."
            aksi={tombolTambah("Tambah data bimbingan", tambahBimbingan)}
          >
            {bimbinganList.length === 0 ? kosong("Belum ada data bimbingan TA", "Klik Tambah data bimbingan untuk mencatat beban bimbingan dosen.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="pl-6 align-bottom">No</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Dosen pembimbing</TableHead>
                    <TableHead colSpan={3} className="text-center">PS sendiri</TableHead>
                    <TableHead colSpan={3} className="text-center">PS lain</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Rata-rata/tahun</TableHead>
                    {canEdit && <TableHead rowSpan={2} className="pr-6 text-right align-bottom">Aksi</TableHead>}
                  </TableRow>
                  <TableRow>{["TS-2", "TS-1", "TS", "TS-2", "TS-1", "TS"].map((t, i) => <TableHead key={i}>{t}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {bimbinganList.map((b, i) => {
                    const total = b.bimbinganPSSendiriTS + b.bimbinganPSSendiriTS1 + b.bimbinganPSSendiriTS2 + b.bimbinganPSLainTS + b.bimbinganPSLainTS1 + b.bimbinganPSLainTS2;
                    const nama = namaDosenDari(b.dosenId, b.dosen);
                    return (
                      <TableRow key={b.id} className="tabular-nums">
                        <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{nama}</TableCell>
                        <TableCell>{b.bimbinganPSSendiriTS2}</TableCell>
                        <TableCell>{b.bimbinganPSSendiriTS1}</TableCell>
                        <TableCell className="font-semibold text-primary">{b.bimbinganPSSendiriTS}</TableCell>
                        <TableCell>{b.bimbinganPSLainTS2}</TableCell>
                        <TableCell>{b.bimbinganPSLainTS1}</TableCell>
                        <TableCell>{b.bimbinganPSLainTS}</TableCell>
                        <TableCell className="font-medium">{(total / 3).toFixed(1)}</TableCell>
                        {aksiBaris(() => setEditingBimbingan({ ...b }), "Hapus data bimbingan TA ini?", () => void aksi("deleteBimbingan", { id: b.id }, "Data bimbingan dihapus."), nama)}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>

        {/* ─── 3.a.3 EWMP ─── */}
        <TabsContent value="3a3">
          <KartuTabel
            nomor={3} judul="Tabel 3.a.3 · Ekuivalensi Waktu Mengajar Penuh (EWMP)"
            deskripsi="Beban kerja SKS pendidikan, penelitian, PkM, dan tugas tambahan."
            aksi={tombolTambah("Tambah data EWMP", tambahEwmp)}
          >
            {ewmpList.length === 0 ? kosong("Belum ada data EWMP", "Klik Tambah data EWMP untuk mengisi rincian SKS dosen.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Dosen tetap</TableHead>
                    <TableHead>Pendidikan (PS sendiri)</TableHead>
                    <TableHead>Pendidikan (PS lain)</TableHead>
                    <TableHead>Penelitian</TableHead>
                    <TableHead>PkM</TableHead>
                    <TableHead>Tugas tambahan</TableHead>
                    <TableHead>Total EWMP</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ewmpList.map((e, i) => {
                    const nama = namaDosenDari(e.dosenId, e.dosen);
                    return (
                      <TableRow key={e.id} className="tabular-nums">
                        <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{nama}</TableCell>
                        <TableCell>{e.sksPendidikanPSSendiri} SKS</TableCell>
                        <TableCell>{e.sksPendidikanPSLain} SKS</TableCell>
                        <TableCell>{e.sksPenelitian} SKS</TableCell>
                        <TableCell>{e.sksPkm} SKS</TableCell>
                        <TableCell>{e.sksTugasTambahan} SKS</TableCell>
                        <TableCell className="font-semibold text-primary">{totalEwmp(e)} SKS</TableCell>
                        {aksiBaris(() => setEditingEwmp({ ...e }), "Hapus data EWMP ini?", () => void aksi("deleteEwmp", { id: e.id }, "Data EWMP dihapus."), nama)}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>

        {/* ─── 3.b Luaran dosen ─── */}
        <TabsContent value="3b">
          <KartuTabel
            nomor={3} judul="Tabel 3.b.1–3.b.8 · Kinerja dan luaran dosen"
            deskripsi="Rekognisi, publikasi ilmiah, sitasi, produk industri, serta HKI dan buku."
            aksi={tombolTambah("Tambah luaran dosen", tambahLuaran)}
          >
            <div className="flex flex-wrap gap-2 px-6 pb-4" role="group" aria-label="Kategori tabel 3.b">
              {SUB_3B.map((s) => (
                <Button key={s.id} size="sm" variant={subTab3b === s.id ? "default" : "outline"} aria-pressed={subTab3b === s.id} onClick={() => setSubTab3b(s.id)}>
                  {s.label}
                </Button>
              ))}
            </div>
            {luaranTampil.length === 0 ? kosong("Belum ada luaran dosen pada kategori ini", "Klik Tambah luaran dosen untuk mencatat data sesuai kategori tabel 3.b.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Nama dosen</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Judul karya / luaran / rekognisi</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Keterangan / nomor registrasi</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {luaranTampil.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{l.namaDosen || l.dosen?.nama || "–"}</TableCell>
                      <TableCell><Badge variant="secondary" className="whitespace-normal">{l.jenis}</Badge></TableCell>
                      <TableCell className="max-w-72 whitespace-normal">{l.judul}</TableCell>
                      <TableCell className="tabular-nums">{l.tahun}</TableCell>
                      <TableCell className="max-w-60 whitespace-normal text-muted-foreground">{l.detail || "–"}</TableCell>
                      {aksiBaris(() => setEditingLuaran({ ...l }), "Hapus data luaran dosen ini?", () => void aksi("deleteLuaranDosen", { id: l.id }, "Luaran dosen dihapus."), l.judul)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>

        {/* ─── 3.c Tendik ─── */}
        <TabsContent value="3c">
          <KartuTabel
            nomor={3} judul="Tabel 3.c · Tenaga kependidikan"
            deskripsi="Jumlah pustakawan, laboran, teknisi, dan tenaga administrasi menurut pendidikan."
            aksi={tombolTambah("Tambah tendik", tambahTendik)}
          >
            {tendikList.length === 0 ? kosong("Belum ada data tenaga kependidikan", "Klik Tambah tendik untuk mengisi data pendukung.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Jenis tenaga kependidikan</TableHead>
                    <TableHead>Pendidikan terakhir</TableHead>
                    <TableHead>Jumlah</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tendikList.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{t.jenis}</TableCell>
                      <TableCell><Badge variant="outline">{t.jenjangPendidikan}</Badge></TableCell>
                      <TableCell className="font-semibold tabular-nums">{t.jumlah} orang</TableCell>
                      {aksiBaris(() => setEditingTendik({ ...t }), "Hapus data tenaga kependidikan ini?", () => void aksi("deleteTendik", { id: t.id }, "Data tendik dihapus."), `${t.jenis} ${t.jenjangPendidikan}`)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>
      </Tabs>

      {/* ─── Dialog dosen tetap ─── */}
      <DialogIsian
        buka={Boolean(editingDosen) && canEdit} onTutup={() => setEditingDosen(null)} sibuk={saving} lebar="sm:max-w-3xl"
        judul={editingDosen && !editingDosen.id.startsWith("temp_") ? "Ubah dosen tetap" : "Tambah dosen tetap"}
        deskripsi="Nomor kolom mengikuti Tabel 3.a.1 LKPS. Nama, NIDN, bidang keahlian, dan MK diampu wajib diisi."
        onSimpan={() => editingDosen && void aksi("saveDosen", editingDosen, "Data dosen tetap tersimpan.", () => setEditingDosen(null))}
      >
        {editingDosen && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <IsianTeks id="dosen-nama" label="Nama lengkap & gelar (kolom 2)" value={editingDosen.nama} placeholder="Dr. Ir. Nama Dosen, M.T." onChange={(v) => ubahDosen({ nama: v })} />
              <IsianTeks id="dosen-nidn" label="NIDN/NIDK (kolom 3)" value={editingDosen.nidn} placeholder="0012345678" onChange={(v) => ubahDosen({ nidn: v })} />
              <IsianTeks id="dosen-s2" label="Prodi magister / magister terapan (S2)" value={editingDosen.prodiPascaS2} placeholder="Contoh: Magister Teknik Elektro Unila" onChange={(v) => ubahDosen({ prodiPascaS2: v, pendidikanS2: Boolean(v) })} />
              <IsianTeks id="dosen-s3" label="Prodi doktor / doktor terapan (S3)" value={editingDosen.prodiPascaS3} placeholder="Kosongkan bila belum S3" onChange={(v) => ubahDosen({ prodiPascaS3: v, pendidikanS3: Boolean(v) })} />
              <IsianTeks id="dosen-bidang" label="Bidang keahlian (kolom 5)" value={editingDosen.bidangKeahlian} placeholder="Contoh: Rekayasa Perangkat Lunak" onChange={(v) => ubahDosen({ bidangKeahlian: v })} />
              <Field>
                <FieldLabel htmlFor="dosen-kompetensi">Kesesuaian dengan kompetensi inti PS (kolom 6)</FieldLabel>
                <Select value={(editingDosen.kesesuaianKompetensi ?? true) ? "true" : "false"} onValueChange={(v) => ubahDosen({ kesesuaianKompetensi: v === "true" })}>
                  <SelectTrigger id="dosen-kompetensi" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Sesuai</SelectItem><SelectItem value="false">Tidak sesuai</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="dosen-jabatan">Jabatan akademik (kolom 7)</FieldLabel>
                <Select value={editingDosen.jabatanAkademik} onValueChange={(v) => ubahDosen({ jabatanAkademik: v })}>
                  <SelectTrigger id="dosen-jabatan" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{JABATAN.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <IsianTeks id="dosen-serdos" label="No. sertifikat pendidik (kolom 8)" value={editingDosen.noSertifikatPendidik} placeholder="Kosongkan bila belum ada" onChange={(v) => ubahDosen({ noSertifikatPendidik: v, sertifikasiDosen: Boolean(v) })} />
              <IsianTeks id="dosen-serkom" label="Bidang sertifikasi profesi/industri (kolom 9)" value={editingDosen.bidangSertifikasi} placeholder="Kosongkan bila belum ada" onChange={(v) => ubahDosen({ bidangSertifikasi: v, sertifikasiKompetensi: Boolean(v) })} />
              <IsianTeks id="dosen-lembaga" label="Lembaga penerbit sertifikasi (kolom 10)" value={editingDosen.lembagaSertifikasi} placeholder="Contoh: BNSP" onChange={(v) => ubahDosen({ lembagaSertifikasi: v })} />
            </div>
            <IsianTeks id="dosen-mk" label="MK diampu di PS yang diakreditasi (kolom 11)" value={editingDosen.mataKuliahDiampu} placeholder="Pisahkan dengan koma" onChange={(v) => ubahDosen({ mataKuliahDiampu: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dosen-sesuai-mk">Kesesuaian keahlian dengan MK (kolom 12)</FieldLabel>
                <Select value={editingDosen.kesesuaianBidang ? "true" : "false"} onValueChange={(v) => ubahDosen({ kesesuaianBidang: v === "true" })}>
                  <SelectTrigger id="dosen-sesuai-mk" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Sesuai</SelectItem><SelectItem value="false">Tidak sesuai</SelectItem></SelectContent>
                </Select>
              </Field>
              <IsianTeks id="dosen-mk-lain" label="MK diampu di PS lain (kolom 13)" value={editingDosen.mataKuliahPSLain} placeholder="Kosongkan bila tidak ada" onChange={(v) => ubahDosen({ mataKuliahPSLain: v })} />
            </div>
          </>
        )}
      </DialogIsian>

      {/* ─── Dialog bimbingan ─── */}
      <DialogIsian
        buka={Boolean(editingBimbingan) && canEdit} onTutup={() => setEditingBimbingan(null)} sibuk={saving}
        judul="Beban bimbingan tugas akhir" deskripsi="Jumlah mahasiswa bimbingan per tahun akademik."
        onSimpan={() => editingBimbingan && void aksi("saveBimbingan", editingBimbingan, "Data bimbingan tersimpan.", () => setEditingBimbingan(null))}
      >
        {editingBimbingan && (
          <>
            <Field>
              <FieldLabel htmlFor="bim-dosen">Dosen pembimbing</FieldLabel>
              <PilihDosen id="bim-dosen" dosen={dosenList} value={editingBimbingan.dosenId} onChange={(v) => ubahBimbingan({ dosenId: v })} />
            </Field>
            {(["Sendiri", "Lain"] as const).map((ps) => (
              <FieldSet key={ps}>
                <FieldLegend variant="label">Bimbingan di PS {ps.toLowerCase()}</FieldLegend>
                <div className="grid grid-cols-3 gap-3">
                  {(["TS2", "TS1", "TS"] as const).map((t) => {
                    const kunci = `bimbinganPS${ps}${t}` as keyof BimbinganRow;
                    return (
                      <IsianAngka
                        key={t} id={`bim-${ps}-${t}`} label={t.replace("TS2", "TS-2").replace("TS1", "TS-1")}
                        value={editingBimbingan[kunci] as number} onChange={(v) => ubahBimbingan({ [kunci]: v } as Partial<BimbinganRow>)}
                      />
                    );
                  })}
                </div>
              </FieldSet>
            ))}
          </>
        )}
      </DialogIsian>

      {/* ─── Dialog EWMP ─── */}
      <DialogIsian
        buka={Boolean(editingEwmp) && canEdit} onTutup={() => setEditingEwmp(null)} sibuk={saving}
        judul="Ekuivalensi Waktu Mengajar Penuh (EWMP)" deskripsi="Beban SKS per semester; boleh pecahan 0,5."
        onSimpan={() => editingEwmp && void aksi("saveEwmp", editingEwmp, "Data EWMP tersimpan.", () => setEditingEwmp(null))}
      >
        {editingEwmp && (
          <>
            <Field>
              <FieldLabel htmlFor="ewmp-dosen">Dosen tetap</FieldLabel>
              <PilihDosen id="ewmp-dosen" dosen={dosenList} value={editingEwmp.dosenId} onChange={(v) => ubahEwmp({ dosenId: v })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <IsianAngka desimal id="ewmp-ps" label="Pendidikan (PS sendiri)" value={editingEwmp.sksPendidikanPSSendiri} onChange={(v) => ubahEwmp({ sksPendidikanPSSendiri: v })} />
              <IsianAngka desimal id="ewmp-pslain" label="Pendidikan (PS lain)" value={editingEwmp.sksPendidikanPSLain} onChange={(v) => ubahEwmp({ sksPendidikanPSLain: v })} />
              <IsianAngka desimal id="ewmp-pen" label="SKS penelitian" value={editingEwmp.sksPenelitian} onChange={(v) => ubahEwmp({ sksPenelitian: v })} />
              <IsianAngka desimal id="ewmp-pkm" label="SKS PkM" value={editingEwmp.sksPkm} onChange={(v) => ubahEwmp({ sksPkm: v })} />
              <IsianAngka desimal id="ewmp-tambahan" label="SKS tugas tambahan/manajerial" value={editingEwmp.sksTugasTambahan} onChange={(v) => ubahEwmp({ sksTugasTambahan: v })} />
            </div>
          </>
        )}
      </DialogIsian>

      {/* ─── Dialog luaran dosen ─── */}
      <DialogIsian
        buka={Boolean(editingLuaran) && canEdit} onTutup={() => setEditingLuaran(null)} sibuk={saving}
        judul="Kinerja dan luaran dosen tetap (Tabel 3.b)" deskripsi="Pilih DTPS terdaftar atau isi nama dosen secara manual."
        onSimpan={() => editingLuaran && void aksi("saveLuaranDosen", editingLuaran, "Luaran dosen tersimpan.", () => setEditingLuaran(null))}
      >
        {editingLuaran && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="luaran-dosen">Dosen tetap (DTPS)</FieldLabel>
                <PilihDosen
                  id="luaran-dosen" dosen={dosenList} value={editingLuaran.dosenId ?? ""} kosong="Pilih DTPS atau isi nama manual"
                  onChange={(v) => ubahLuaran({ dosenId: v, namaDosen: dosenList.find((d) => d.id === v)?.nama ?? editingLuaran.namaDosen })}
                />
              </Field>
              <IsianTeks id="luaran-nama" label="Nama dosen (tampil di borang)" value={editingLuaran.namaDosen} onChange={(v) => ubahLuaran({ namaDosen: v })} />
            </div>
            <Field>
              <FieldLabel htmlFor="luaran-jenis">Kategori / tabel indikator LAM Teknik</FieldLabel>
              <Select value={editingLuaran.jenis} onValueChange={(v) => ubahLuaran({ jenis: v })}>
                <SelectTrigger id="luaran-jenis" className="w-full"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_LUARAN.map((g) => (
                    <SelectGroup key={g.grup}>
                      <SelectLabel>{g.grup}</SelectLabel>
                      {g.pilihan.map(([nilai, label]) => <SelectItem key={nilai} value={nilai}>{label}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <IsianTeks id="luaran-judul" label={lblJudul} value={editingLuaran.judul} onChange={(v) => ubahLuaran({ judul: v })} />
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <IsianAngka id="luaran-tahun" label={lblTahun} value={editingLuaran.tahun} onChange={(v) => ubahLuaran({ tahun: v })} />
              <IsianTeks id="luaran-detail" label={lblDetail} value={editingLuaran.detail} onChange={(v) => ubahLuaran({ detail: v })} />
            </div>
          </>
        )}
      </DialogIsian>

      {/* ─── Dialog tendik ─── */}
      <DialogIsian
        buka={Boolean(editingTendik) && canEdit} onTutup={() => setEditingTendik(null)} sibuk={saving}
        judul="Tenaga kependidikan"
        onSimpan={() => editingTendik && void aksi("saveTendik", editingTendik, "Data tendik tersimpan.", () => setEditingTendik(null))}
      >
        {editingTendik && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="tendik-jenis">Jenis</FieldLabel>
              <Select value={editingTendik.jenis} onValueChange={(v) => ubahTendik({ jenis: v })}>
                <SelectTrigger id="tendik-jenis" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{JENIS_TENDIK.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="tendik-jenjang">Pendidikan terakhir</FieldLabel>
              <Select value={editingTendik.jenjangPendidikan} onValueChange={(v) => ubahTendik({ jenjangPendidikan: v })}>
                <SelectTrigger id="tendik-jenjang" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{JENJANG_TENDIK.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="tendik-jumlah">Jumlah personel</FieldLabel>
              <Input id="tendik-jumlah" type="number" min={1} value={editingTendik.jumlah} onChange={(e) => ubahTendik({ jumlah: parseInt(e.target.value) || 1 })} />
            </Field>
          </div>
        )}
      </DialogIsian>
    </>
  );
}
