"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/luaran/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }. Gabung LKPS G7: dibuat ulang dengan komponen LED (Tabs, Table,
// Dialog, Field, Select, AlertDialog, toast). Indikator, kolom tabel 8.a/8.b/8.d–8.e, isian, dan aksi API (saveIpk,
// savePrestasi, deletePrestasi) tidak berubah. Perbedaan:
// - IPK awal (belum ada data) 0, bukan angka contoh 2,75/3,25/3,85 dst. yang bisa ikut tersimpan;
// - tracer kosong tidak lagi bertuliskan "Data Tracer Study Terhubung / form aktif" (halaman ini tidak punya formulir
//   tracer), tetapi menunjuk Impor One Data; formulir prestasi tanpa contoh "Juara 1".
// Data efektivitas studi dimuat kode asal tetapi tidak pernah ditampilkan; tetap tidak ditampilkan.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Briefcase, GraduationCap, Pencil, Plus, Trophy } from "lucide-react";
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

interface IpkRow {
  id: string;
  tahunSemester: string;
  ipkMinimum: number;
  ipkRataRata: number;
  ipkMaksimum: number;
}

interface PrestasiRow {
  id: string;
  namaMahasiswa: string;
  namaKegiatan: string;
  tingkat: string;
  penghargaan: string;
  tahun: number;
  jenis: string;
}

interface TracerRow {
  id: string;
  tahun: number;
  jumlahResponden: number;
  rataWaktuTunggu: number;
  persenSesuaiBidang: number;
  persenTempatKerjaLokal: number;
  persenTempatKerjaNasional: number;
  persenTempatKerjaInternasional: number;
  skorKepuasanPengguna: number;
}

const URUT_TS = ["TS-2", "TS-1", "TS"];
const ipkKosong = (t: string): IpkRow => ({ id: `temp_${t.toLowerCase().replace("-", "")}`, tahunSemester: t, ipkMinimum: 0, ipkRataRata: 0, ipkMaksimum: 0 });
const KOLOM_IPK = [["ipkMinimum", "IPK minimum"], ["ipkRataRata", "IPK rata-rata"], ["ipkMaksimum", "IPK maksimum"]] as const;

export default function HalamanLuaran() {
  const { canEdit } = useModulePermission("luaran");
  const [ipkList, setIpkList] = useState<IpkRow[]>(URUT_TS.map(ipkKosong));
  const [prestasiList, setPrestasiList] = useState<PrestasiRow[]>([]);
  const [tracerList, setTracerList] = useState<TracerRow[]>([]);
  const [editing, setEditing] = useState<PrestasiRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await kirimLkps("/api/lkps/luaran");
      if (res.ok) {
        const data = (await res.json()) as { ipk?: IpkRow[]; prestasi?: PrestasiRow[]; tracer?: TracerRow[] };
        if (data.ipk?.length) setIpkList(URUT_TS.map((t) => data.ipk!.find((i) => i.tahunSemester === t) ?? ipkKosong(t)));
        setPrestasiList(data.prestasi || []);
        setTracerList(data.tracer || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Hitungan kode asal (tanpa perubahan)
  const avgIpk = ipkList.length > 0 ? ipkList.reduce((a, i) => a + (i.ipkRataRata || 0), 0) / ipkList.length : 0;

  async function aksi(action: string, payload: unknown, sukses: string, tutup?: () => void) {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/luaran", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      if (res.ok) {
        await fetchData();
        tutup?.();
        toast.success(sukses);
      }
    } finally {
      setSaving(false);
    }
  }

  const ubahIpk = (t: string, k: keyof IpkRow, v: number) => setIpkList((l) => l.map((r) => (r.tahunSemester === t ? { ...r, [k]: v } : r)));
  const ubah = (p: Partial<PrestasiRow>) => setEditing((e) => (e ? { ...e, ...p } : e));

  return (
    <>
      <JudulHalaman judul="Kriteria 8: Luaran & Capaian Tridharma" deskripsi="Tabel 8.a, 8.b, 8.d, dan 8.e LKPS: IPK lulusan, prestasi mahasiswa, tracer study." />
      <RoleNotice module="luaran" />

      <KartuHitung
        judul="Indikator luaran dan capaian lulusan"
        deskripsi="Matriks Penilaian LAM Teknik; dihitung langsung dari tabel di bawah."
        skor={<Badge className="h-7 px-2.5 text-sm">Rata-rata IPK: {avgIpk.toFixed(2)}</Badge>}
      >
        <BarisAngka>
          <Angka label="Rata-rata IPK lulusan" nilai={avgIpk.toFixed(2)} nada="text-blue-700 dark:text-blue-300" />
          <Angka label="Prestasi mahasiswa" nilai={`${prestasiList.length} penghargaan`} nada="text-amber-700 dark:text-amber-300" />
          <Angka label="Tracer study" nilai={`${tracerList.length} tahun data`} nada="text-emerald-700 dark:text-emerald-300" />
        </BarisAngka>
      </KartuHitung>

      <Tabs defaultValue="ipk" className="gap-4">
        <TabsList>
          <TabsTrigger value="ipk"><GraduationCap aria-hidden />8.a · IPK lulusan</TabsTrigger>
          <TabsTrigger value="prestasi"><Trophy aria-hidden />8.b · Prestasi</TabsTrigger>
          <TabsTrigger value="tracer"><Briefcase aria-hidden />8.d–8.e · Tracer study</TabsTrigger>
        </TabsList>

        <TabsContent value="ipk" className="flex flex-col gap-4">
          <KartuTabel nomor={8} judul="Tabel 8.a · Indeks Prestasi Kumulatif (IPK)" deskripsi="IPK minimum, rata-rata, dan maksimum lulusan per tahun.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tahun</TableHead>
                  {KOLOM_IPK.map(([k, n], i) => <TableHead key={k} className={i === 2 ? "pr-6" : undefined}>{n}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipkList.map((r) => (
                  <TableRow key={r.tahunSemester}>
                    <TableCell className="pl-6"><LencanaTahun tahun={r.tahunSemester} /></TableCell>
                    {KOLOM_IPK.map(([k, n], i) => (
                      <TableCell key={k} className={i === 2 ? "pr-6" : undefined}>
                        <InputAngka desimal className="w-24" label={`${n} ${r.tahunSemester}`} value={r[k]} disabled={!canEdit} onChange={(v) => ubahIpk(r.tahunSemester, k, v)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KartuTabel>
          {canEdit && (
            <div className="flex justify-end">
              <TombolSimpan sibuk={saving} onClick={() => void aksi("saveIpk", { rows: ipkList }, "Data IPK tersimpan.")}>Simpan data IPK</TombolSimpan>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prestasi">
          <KartuTabel
            nomor={8} judul="Tabel 8.b · Prestasi mahasiswa" deskripsi="Akademik dan non-akademik (wilayah, nasional, internasional)."
            aksi={canEdit && (
              <Button onClick={() => setEditing({ id: `temp_${Date.now()}`, namaMahasiswa: "", namaKegiatan: "", tingkat: "Nasional", penghargaan: "", tahun: new Date().getFullYear(), jenis: "Akademik" })}>
                <Plus aria-hidden />Tambah prestasi
              </Button>
            )}
          >
            {prestasiList.length === 0 ? (
              <KosongArahan nomor={8} judul={loading ? "Memuat data…" : "Belum ada data prestasi mahasiswa"}>
                {!loading && (canEdit ? "Klik Tambah prestasi untuk mengisi data penghargaan lomba." : "Tim Prodi belum mengisi tabel ini.")}
              </KosongArahan>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>Kegiatan / lomba</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead>Penghargaan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tahun</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prestasiList.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.namaMahasiswa}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal">{p.namaKegiatan}</TableCell>
                      <TableCell><Badge variant="outline">{p.tingkat}</Badge></TableCell>
                      <TableCell><Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{p.penghargaan}</Badge></TableCell>
                      <TableCell>{p.jenis}</TableCell>
                      <TableCell className="tabular-nums">{p.tahun}</TableCell>
                      {canEdit && (
                        <TableCell className="pr-6 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" aria-label={`Ubah ${p.namaKegiatan}`} onClick={() => setEditing({ ...p })}><Pencil aria-hidden /></Button>
                          <TombolHapus label={`Hapus ${p.namaKegiatan}`} judul="Hapus prestasi ini?" deskripsi={`${p.namaMahasiswa}: ${p.namaKegiatan}`} onHapus={() => void aksi("deletePrestasi", { id: p.id }, "Prestasi dihapus.")} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>

        <TabsContent value="tracer">
          <KartuTabel nomor={8} judul="Tabel 8.d–8.e · Tracer study dan kepuasan pengguna" deskripsi="Waktu tunggu kerja, kesesuaian bidang, tingkat tempat kerja.">
            {tracerList.length === 0 ? (
              <KosongArahan nomor={8} judul={loading ? "Memuat data…" : "Belum ada data tracer study"}>
                {!loading && <>Data tracer diisi lewat <Link href="/lkps/impor" className="font-medium text-primary underline-offset-4 hover:underline">Impor One Data</Link> (berkas tracer study atau sinkron One Data).</>}
              </KosongArahan>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Tahun</TableHead>
                    <TableHead>Responden</TableHead>
                    <TableHead>Waktu tunggu</TableHead>
                    <TableHead>Sesuai bidang</TableHead>
                    <TableHead>Tempat kerja (lokal/nasional/internasional)</TableHead>
                    <TableHead className="pr-6">Skor kepuasan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracerList.map((t) => (
                    <TableRow key={t.id} className="tabular-nums">
                      <TableCell className="pl-6">{t.tahun}</TableCell>
                      <TableCell>{t.jumlahResponden} orang</TableCell>
                      <TableCell className="font-medium">{t.rataWaktuTunggu} bulan</TableCell>
                      <TableCell className="font-medium">{t.persenSesuaiBidang}%</TableCell>
                      <TableCell>{t.persenTempatKerjaLokal}% / {t.persenTempatKerjaNasional}% / {t.persenTempatKerjaInternasional}%</TableCell>
                      <TableCell className="pr-6"><Badge variant="secondary">{t.skorKepuasanPengguna} / 4,0</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editing) && canEdit} onOpenChange={(b) => !b && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id.startsWith("temp_") ? "Tambah prestasi mahasiswa" : "Ubah prestasi mahasiswa"}</DialogTitle>
            <DialogDescription>Nama mahasiswa, kegiatan, dan tahun wajib diisi.</DialogDescription>
          </DialogHeader>
          {editing && (
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="pr-nama">Nama mahasiswa</FieldLabel><Input id="pr-nama" value={editing.namaMahasiswa} onChange={(e) => ubah({ namaMahasiswa: e.target.value })} /></Field>
                <Field>
                  <FieldLabel htmlFor="pr-tingkat">Tingkat prestasi</FieldLabel>
                  <Select value={editing.tingkat} onValueChange={(v) => ubah({ tingkat: v })}>
                    <SelectTrigger id="pr-tingkat" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Wilayah/Lokal", "Nasional", "Internasional"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field><FieldLabel htmlFor="pr-kegiatan">Nama kegiatan / kompetisi</FieldLabel><Input id="pr-kegiatan" placeholder="Contoh: Kontes Robot Indonesia" value={editing.namaKegiatan} onChange={(e) => ubah({ namaKegiatan: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem_7rem]">
                <Field><FieldLabel htmlFor="pr-capaian">Capaian / penghargaan</FieldLabel><Input id="pr-capaian" placeholder="Contoh: Juara 1, medali emas" value={editing.penghargaan} onChange={(e) => ubah({ penghargaan: e.target.value })} /></Field>
                <Field>
                  <FieldLabel htmlFor="pr-jenis">Jenis</FieldLabel>
                  <Select value={editing.jenis} onValueChange={(v) => ubah({ jenis: v })}>
                    <SelectTrigger id="pr-jenis" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Akademik", "Non-Akademik"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field><FieldLabel htmlFor="pr-tahun">Tahun</FieldLabel><Input id="pr-tahun" type="number" value={editing.tahun} onChange={(e) => ubah({ tahun: parseInt(e.target.value) || 0 })} /></Field>
              </div>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={saving} onClick={() => editing && void aksi("savePrestasi", editing, "Prestasi tersimpan.", () => setEditing(null))}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
