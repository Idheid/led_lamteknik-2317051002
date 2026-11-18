"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/keuangan/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }. Gabung LKPS G7: dibuat ulang dengan komponen LED (Tabs, Table,
// Dialog, Field, Select, AlertDialog, toast). Ringkasan dana, kolom tabel 4.a/4.b, isian, dan aksi API (saveDana,
// saveLab, deleteLab) tidak berubah. Perbedaan: formulir tambah lab tidak lagi terisi contoh angka (asal: 30 jam,
// 72 m²); urutan baris dana TS-2 → TS.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Pencil, Plus, Wallet } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import {
  Angka, BarisAngka, InputAngka, KartuHitung, KartuTabel, KosongArahan, LencanaTahun, TombolHapus, TombolSimpan,
} from "@/modules/lkps/komponen/bersama/ui-lkps";

interface DanaRow {
  id: string;
  tahunSemester: string;
  biayaOperasionalPendidikan: number;
  biayaPenelitianDosen: number;
  biayaPkmDosen: number;
  investasiSdm: number;
  investasiSarana: number;
  investasiPrasarana: number;
}

interface LabRow {
  id: string;
  namaLab: string;
  jenisPeralatan: string;
  kepemilikan: string;
  kondisi: string;
  jamPenggunaan: number;
  luasRuangan: number;
}

const URUT_TS = ["TS-2", "TS-1", "TS"];
const danaKosong = (t: string): DanaRow => ({
  id: `temp_${t.toLowerCase().replace("-", "")}`, tahunSemester: t, biayaOperasionalPendidikan: 0, biayaPenelitianDosen: 0,
  biayaPkmDosen: 0, investasiSdm: 0, investasiSarana: 0, investasiPrasarana: 0,
});

const KOLOM_DANA = [
  ["biayaOperasionalPendidikan", "Operasional pendidikan"], ["biayaPenelitianDosen", "Penelitian dosen"],
  ["biayaPkmDosen", "PkM dosen"], ["investasiSdm", "Investasi SDM"], ["investasiSarana", "Investasi sarana"],
  ["investasiPrasarana", "Investasi prasarana"],
] as const;

const rupiah = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

export default function HalamanKeuangan() {
  const { canEdit } = useModulePermission("keuangan");
  const [danaList, setDanaList] = useState<DanaRow[]>(URUT_TS.map(danaKosong));
  const [labList, setLabList] = useState<LabRow[]>([]);
  const [editingLab, setEditingLab] = useState<LabRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await kirimLkps("/api/lkps/keuangan");
      if (res.ok) {
        const data = (await res.json()) as { dana?: DanaRow[]; lab?: LabRow[] };
        if (data.dana?.length) setDanaList(URUT_TS.map((t) => data.dana!.find((d) => d.tahunSemester === t) ?? danaKosong(t)));
        setLabList(data.lab || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const jumlah = (k: keyof DanaRow) => danaList.reduce((a, d) => a + (Number(d[k]) || 0), 0);

  async function aksi(action: string, payload: unknown, sukses: string, tutup?: () => void) {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/keuangan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      if (res.ok) {
        await fetchData();
        tutup?.();
        toast.success(sukses);
      }
    } finally {
      setSaving(false);
    }
  }

  const ubahDana = (tahun: string, kolom: keyof DanaRow, v: number) => setDanaList((l) => l.map((d) => (d.tahunSemester === tahun ? { ...d, [kolom]: v } : d)));
  const ubahLab = (p: Partial<LabRow>) => setEditingLab((l) => (l ? { ...l, ...p } : l));

  return (
    <>
      <JudulHalaman judul="Kriteria 4: Keuangan, Sarana & Prasarana" deskripsi="Tabel 4.a, 4.b, dan 4.c LKPS: penggunaan dana dan sarana laboratorium." />
      <RoleNotice module="keuangan" />

      <KartuHitung judul="Ringkasan penggunaan dana tridharma" deskripsi="Akumulasi TS-2 sampai TS, dihitung langsung dari Tabel 4.a.">
        <BarisAngka>
          <Angka label="Operasional pendidikan" nilai={rupiah(jumlah("biayaOperasionalPendidikan"))} nada="text-blue-700 dark:text-blue-300" />
          <Angka label="Penelitian dosen" nilai={rupiah(jumlah("biayaPenelitianDosen"))} nada="text-violet-700 dark:text-violet-300" />
          <Angka label="PkM dosen" nilai={rupiah(jumlah("biayaPkmDosen"))} nada="text-emerald-700 dark:text-emerald-300" />
        </BarisAngka>
      </KartuHitung>

      <Tabs defaultValue="dana" className="gap-4">
        <TabsList>
          <TabsTrigger value="dana"><Wallet aria-hidden />Tabel 4.a · Penggunaan dana</TabsTrigger>
          <TabsTrigger value="lab"><FlaskConical aria-hidden />Tabel 4.b & 4.c · Sarana & laboratorium</TabsTrigger>
        </TabsList>

        <TabsContent value="dana" className="flex flex-col gap-4">
          <KartuTabel nomor={4} judul="Tabel 4.a · Penggunaan dana" deskripsi="Dalam rupiah (IDR), per tahun TS-2 sampai TS.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Periode</TableHead>
                  {KOLOM_DANA.map(([k, n], i) => <TableHead key={k} className={i === KOLOM_DANA.length - 1 ? "pr-6" : undefined}>{n}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {danaList.map((d) => (
                  <TableRow key={d.tahunSemester}>
                    <TableCell className="pl-6"><LencanaTahun tahun={d.tahunSemester} /></TableCell>
                    {KOLOM_DANA.map(([k, n], i) => (
                      <TableCell key={k} className={i === KOLOM_DANA.length - 1 ? "pr-6" : undefined}>
                        <InputAngka desimal className="w-32 min-w-28 text-right" label={`${n} ${d.tahunSemester}`} value={d[k]} disabled={!canEdit} onChange={(v) => ubahDana(d.tahunSemester, k, v)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KartuTabel>
          {canEdit && (
            <div className="flex justify-end">
              <TombolSimpan sibuk={saving} onClick={() => void aksi("saveDana", { rows: danaList }, "Data penggunaan dana tersimpan.")}>Simpan data penggunaan dana</TombolSimpan>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lab">
          <KartuTabel
            nomor={4} judul="Tabel 4.b & 4.c · Sarana dan laboratorium" deskripsi="Ruang praktikum, peralatan utama, dan kondisinya."
            aksi={canEdit && (
              <Button onClick={() => setEditingLab({ id: `temp_${Date.now()}`, namaLab: "", jenisPeralatan: "", kepemilikan: "Milik Sendiri", kondisi: "Baik", jamPenggunaan: 0, luasRuangan: 0 })}>
                <Plus aria-hidden />Tambah lab / sarana
              </Button>
            )}
          >
            {labList.length === 0 ? (
              <KosongArahan nomor={4} judul={loading ? "Memuat data…" : "Belum ada data laboratorium"}>
                {!loading && (canEdit ? "Klik Tambah lab / sarana untuk mendaftarkan ruang laboratorium." : "Tim Prodi belum mengisi tabel ini.")}
              </KosongArahan>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Laboratorium / studio</TableHead>
                    <TableHead>Peralatan utama</TableHead>
                    <TableHead>Kepemilikan</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Luas</TableHead>
                    <TableHead>Jam pakai/minggu</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labList.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{l.namaLab}</TableCell>
                      <TableCell className="max-w-56 whitespace-normal">{l.jenisPeralatan}</TableCell>
                      <TableCell><Badge variant="outline">{l.kepemilikan}</Badge></TableCell>
                      <TableCell>
                        <Badge className={l.kondisi === "Baik" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}>{l.kondisi}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{l.luasRuangan} m²</TableCell>
                      <TableCell className="tabular-nums">{l.jamPenggunaan} jam</TableCell>
                      {canEdit && (
                        <TableCell className="pr-6 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" aria-label={`Ubah ${l.namaLab}`} onClick={() => setEditingLab({ ...l })}><Pencil aria-hidden /></Button>
                          <TombolHapus label={`Hapus ${l.namaLab}`} judul="Hapus data sarana/laboratorium ini?" deskripsi={l.namaLab} onHapus={() => void aksi("deleteLab", { id: l.id }, "Data laboratorium dihapus.")} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingLab) && canEdit} onOpenChange={(b) => !b && setEditingLab(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingLab?.id.startsWith("temp_") ? "Tambah laboratorium / sarana" : "Ubah laboratorium / sarana"}</DialogTitle>
            <DialogDescription>Nama laboratorium wajib diisi.</DialogDescription>
          </DialogHeader>
          {editingLab && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="lab-nama">Nama laboratorium / studio / ruang praktikum</FieldLabel>
                <Input id="lab-nama" value={editingLab.namaLab} onChange={(e) => ubahLab({ namaLab: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lab-alat">Jenis peralatan utama</FieldLabel>
                <Input id="lab-alat" value={editingLab.jenisPeralatan} onChange={(e) => ubahLab({ jenisPeralatan: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="lab-milik">Status kepemilikan</FieldLabel>
                  <Select value={editingLab.kepemilikan} onValueChange={(v) => ubahLab({ kepemilikan: v })}>
                    <SelectTrigger id="lab-milik" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Milik Sendiri", "Sewa / Kerjasama"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lab-kondisi">Kondisi peralatan</FieldLabel>
                  <Select value={editingLab.kondisi} onValueChange={(v) => ubahLab({ kondisi: v })}>
                    <SelectTrigger id="lab-kondisi" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Baik", "Rusak Ringan", "Rusak Berat"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lab-luas">Luas ruangan (m²)</FieldLabel>
                  <Input id="lab-luas" type="number" min={0} value={editingLab.luasRuangan} onChange={(e) => ubahLab({ luasRuangan: parseFloat(e.target.value) || 0 })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lab-jam">Rata-rata jam pakai per minggu</FieldLabel>
                  <Input id="lab-jam" type="number" min={0} value={editingLab.jamPenggunaan} onChange={(e) => ubahLab({ jamPenggunaan: parseFloat(e.target.value) || 0 })} />
                </Field>
              </div>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLab(null)}>Batal</Button>
            <Button disabled={saving} onClick={() => editingLab && void aksi("saveLab", editingLab, "Data laboratorium tersimpan.", () => setEditingLab(null))}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
