"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/kerjasama/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }. Gabung LKPS G7: dibuat ulang dengan komponen LED (Card, Table,
// Dialog, Field, Input, Select, Textarea, Badge, AlertDialog, toast). Rumus RK, skor, dan alur simpan (ganti semua
// baris prodi) tidak berubah. Perbaikan tampilan: kotak unggah MoU kini bisa diklik (kode asal: input tersembunyi tanpa
// label) dan tautan MoU tampil untuk bukti yang diunggah (kode asal hanya mengenali alamat lama /uploads).

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import {
  Angka, BarisAngka, KartuHitung, KartuTabel, KosongArahan, LencanaSkor, namaDariAlamatBukti, TautanBukti, TombolHapus,
  TombolSimpan, UnggahBukti,
} from "@/modules/lkps/komponen/bersama/ui-lkps";

interface KerjasamaRow {
  id: string;
  namaLembaga: string;
  tingkat: string;
  judulKegiatan: string;
  manfaat: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  jenisKerjasama: string; // N1, N2, N3
  fileMou: string | null;
  fileName: string | null;
}

// ─── Rumus kode asal (tanpa perubahan) ────────────────────────

function hitungRK(rows: KerjasamaRow[], ndtps: number): number {
  if (ndtps === 0) return 0;
  const n1 = rows.filter((r) => r.jenisKerjasama === "N1").length;
  const n2 = rows.filter((r) => r.jenisKerjasama === "N2").length;
  const n3 = rows.filter((r) => r.jenisKerjasama === "N3").length;
  return (2 * n1 + 1 * n2 + 3 * n3) / ndtps;
}

function getSkorRK(rk: number): { skor: number; label: string } {
  if (rk >= 3) return { skor: 4, label: "Sangat Baik" };
  if (rk >= 2) return { skor: 3, label: "Baik" };
  if (rk >= 1) return { skor: 2, label: "Cukup" };
  return { skor: 1, label: "Kurang" };
}

const TINGKAT = ["Internasional", "Nasional", "Wilayah/Lokal"];
const JENIS: Record<string, string> = { N1: "Pendidikan", N2: "Penelitian", N3: "PkM" };
const NADA_JENIS: Record<string, string> = {
  N1: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  N2: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  N3: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const tahun = (t: string) => (t ? new Date(t).getFullYear() : "–");

export default function HalamanKerjasama() {
  const { canEdit } = useModulePermission("kerjasama");
  const [rows, setRows] = useState<KerjasamaRow[]>([]);
  const [ndtps, setNdtps] = useState(10);
  const [editingRow, setEditingRow] = useState<KerjasamaRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await kirimLkps("/api/lkps/kerjasama");
      if (res.ok) {
        const data = (await res.json()) as Record<string, string | null>[];
        setRows(data.map((d) => ({
          id: String(d.id),
          namaLembaga: d.namaLembaga ?? "",
          tingkat: d.tingkat ?? "Nasional",
          judulKegiatan: d.judulKegiatan ?? "",
          manfaat: d.manfaat ?? "",
          tanggalMulai: d.tanggalMulai ? d.tanggalMulai.split("T")[0] : "",
          tanggalAkhir: d.tanggalAkhir ? d.tanggalAkhir.split("T")[0] : "",
          jenisKerjasama: d.jenisKerjasama ?? "N1",
          fileMou: d.fileMou ?? null,
          fileName: namaDariAlamatBukti(d.fileMou),
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const blankRow = (): KerjasamaRow => ({
    id: Date.now().toString(), namaLembaga: "", tingkat: "Nasional", judulKegiatan: "", manfaat: "", tanggalMulai: "",
    tanggalAkhir: "", jenisKerjasama: "N1", fileMou: null, fileName: null,
  });

  const rk = hitungRK(rows, ndtps);
  const { skor, label } = getSkorRK(rk);
  const hitung = (f: (r: KerjasamaRow) => boolean) => rows.filter(f).length;
  const n1 = hitung((r) => r.jenisKerjasama === "N1");
  const n2 = hitung((r) => r.jenisKerjasama === "N2");
  const n3 = hitung((r) => r.jenisKerjasama === "N3");

  async function kirimSemua(baru: KerjasamaRow[], pesanSukses: string) {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/kerjasama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: baru }),
      });
      if (res.ok) {
        await fetchData();
        toast.success(pesanSukses);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRow() {
    if (!editingRow) return;
    const ada = rows.some((r) => r.id === editingRow.id);
    const baru = ada ? rows.map((r) => (r.id === editingRow.id ? editingRow : r)) : [...rows, editingRow];
    setRows(baru);
    setEditingRow(null);
    await kirimSemua(baru, "Data kerja sama tersimpan.");
  }

  async function handleDeleteRow(id: string) {
    const baru = rows.filter((r) => r.id !== id);
    setRows(baru);
    await kirimSemua(baru, "Data kerja sama dihapus.");
  }

  const ubah = (kolom: keyof KerjasamaRow, nilai: string | null) => setEditingRow((p) => (p ? { ...p, [kolom]: nilai } : p));
  const sedangUbah = editingRow ? rows.some((r) => r.id === editingRow.id) : false;

  return (
    <>
      <JudulHalaman
        judul="Kriteria 1: Tata Pamong & Kerjasama"
        deskripsi="Tabel 1 LKPS: data kerja sama institusional. Rasio Kerjasama (RK) dihitung otomatis."
      />
      <RoleNotice module="kerjasama" />

      <KartuHitung
        judul="Rasio Kerjasama (RK)"
        deskripsi="Dihitung langsung dari tabel di bawah, sesuai Matriks Penilaian LAM Teknik Diploma III."
        skor={<LencanaSkor skor={skor} label={label} />}
        rumus={<>RK = (2 × N1 + 1 × N2 + 3 × N3) / NDTPS = (2×{n1} + 1×{n2} + 3×{n3}) / {ndtps} = <strong>{rk.toFixed(3)}</strong></>}
      >
        <BarisAngka>
          <Angka label="N1 Pendidikan" nilai={n1} nada="text-blue-700 dark:text-blue-300" />
          <Angka label="N2 Penelitian" nilai={n2} nada="text-violet-700 dark:text-violet-300" />
          <Angka label="N3 PkM" nilai={n3} nada="text-emerald-700 dark:text-emerald-300" />
          <div className="hidden h-10 w-px bg-border sm:block" aria-hidden />
          <Angka label="Internasional" nilai={hitung((r) => r.tingkat === "Internasional")} />
          <Angka label="Nasional" nilai={hitung((r) => r.tingkat === "Nasional")} />
          <Angka label="Lokal" nilai={hitung((r) => r.tingkat === "Wilayah/Lokal")} />
          <Field orientation="horizontal" className="ml-auto w-auto">
            <FieldLabel htmlFor="rk-ndtps" className="whitespace-nowrap">Jumlah DTPS</FieldLabel>
            <Input
              id="rk-ndtps" type="number" min={1} className="w-20 text-center" disabled={!canEdit}
              value={ndtps} onChange={(e) => setNdtps(parseInt(e.target.value) || 1)}
            />
          </Field>
        </BarisAngka>
      </KartuHitung>

      <KartuTabel
        nomor={1}
        judul="Data kerja sama (Tabel 1 LKPS)"
        deskripsi={`${rows.length} data kerja sama`}
        aksi={canEdit && <Button onClick={() => setEditingRow(blankRow())}><Plus aria-hidden />Tambah kerja sama</Button>}
      >
        {rows.length === 0 ? (
          <KosongArahan nomor={1} judul={loading ? "Memuat data…" : "Belum ada data kerja sama"}>
            {!loading && (canEdit
              ? "Klik Tambah kerja sama untuk menambahkan data kerja sama institusional sesuai Tabel 1 LKPS."
              : "Tim Prodi belum mengisi data kerja sama.")}
          </KosongArahan>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-6">No</TableHead>
                <TableHead>Lembaga mitra</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Judul kegiatan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>MoU/MoA</TableHead>
                {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{row.namaLembaga || "–"}</TableCell>
                  <TableCell><Badge variant="outline">{row.tingkat}</Badge></TableCell>
                  <TableCell><Badge className={NADA_JENIS[row.jenisKerjasama]}>{row.jenisKerjasama} · {JENIS[row.jenisKerjasama]}</Badge></TableCell>
                  <TableCell className="max-w-56 truncate" title={row.judulKegiatan}>{row.judulKegiatan || "–"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{tahun(row.tanggalMulai)} – {tahun(row.tanggalAkhir)}</TableCell>
                  <TableCell><TautanBukti url={row.fileMou} nama={row.fileName} /></TableCell>
                  {canEdit && (
                    <TableCell className="pr-6 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" aria-label={`Ubah ${row.namaLembaga}`} onClick={() => setEditingRow({ ...row })}><Pencil aria-hidden /></Button>
                      <TombolHapus label={`Hapus ${row.namaLembaga}`} judul="Hapus data kerja sama ini?" deskripsi={`${row.namaLembaga}: ${row.judulKegiatan}`} onHapus={() => void handleDeleteRow(row.id)} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KartuTabel>

      {canEdit && rows.length > 0 && (
        <div className="flex justify-end">
          <TombolSimpan sibuk={saving} onClick={() => void kirimSemua(rows, "Data kerja sama tersimpan.")}>Simpan data kerja sama</TombolSimpan>
        </div>
      )}

      <Dialog open={Boolean(editingRow) && canEdit} onOpenChange={(b) => !b && setEditingRow(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{sedangUbah ? "Ubah data kerja sama" : "Tambah data kerja sama"}</DialogTitle>
            <DialogDescription>Tanggal mulai dan berakhir wajib diisi.</DialogDescription>
          </DialogHeader>
          {editingRow && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ks-lembaga">Nama lembaga/institusi mitra</FieldLabel>
                <Input id="ks-lembaga" placeholder="Nama instansi mitra" value={editingRow.namaLembaga} onChange={(e) => ubah("namaLembaga", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ks-tingkat">Tingkat</FieldLabel>
                  <Select value={editingRow.tingkat} onValueChange={(v) => ubah("tingkat", v)}>
                    <SelectTrigger id="ks-tingkat" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{TINGKAT.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ks-jenis">Jenis</FieldLabel>
                  <Select value={editingRow.jenisKerjasama} onValueChange={(v) => ubah("jenisKerjasama", v)}>
                    <SelectTrigger id="ks-jenis" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N1">N1 · Pendidikan</SelectItem>
                      <SelectItem value="N2">N2 · Penelitian</SelectItem>
                      <SelectItem value="N3">N3 · Pengabdian kepada Masyarakat</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="ks-judul">Judul/nama kegiatan</FieldLabel>
                <Input id="ks-judul" placeholder="Judul MoU atau kegiatan" value={editingRow.judulKegiatan} onChange={(e) => ubah("judulKegiatan", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ks-manfaat">Manfaat kerja sama</FieldLabel>
                <Textarea id="ks-manfaat" rows={2} placeholder="Manfaat kerja sama bagi prodi" value={editingRow.manfaat} onChange={(e) => ubah("manfaat", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ks-mulai">Tanggal mulai</FieldLabel>
                  <Input id="ks-mulai" type="date" value={editingRow.tanggalMulai} onChange={(e) => ubah("tanggalMulai", e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ks-akhir">Tanggal berakhir</FieldLabel>
                  <Input id="ks-akhir" type="date" value={editingRow.tanggalAkhir} onChange={(e) => ubah("tanggalAkhir", e.target.value)} />
                </Field>
              </div>
              <Field>
                <FieldLabel>Dokumen MoU/MoA</FieldLabel>
                <UnggahBukti
                  accept="application/pdf,.pdf" label="Pilih berkas PDF" keterangan="PDF, maksimal 10 MB"
                  onTerunggah={(url, nama) => setEditingRow((p) => (p ? { ...p, fileMou: url, fileName: nama } : p))}
                />
                {editingRow.fileMou && <TautanBukti url={editingRow.fileMou} nama={editingRow.fileName} />}
              </Field>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>Batal</Button>
            <Button onClick={() => void handleSaveRow()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
