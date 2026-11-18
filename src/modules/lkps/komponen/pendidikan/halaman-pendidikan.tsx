"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/pendidikan/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }. Gabung LKPS G7: dibuat ulang dengan komponen LED (Tabs, Table,
// Dialog, Field, AlertDialog, toast). Kartu kurikulum, kolom tabel 5.a.1/5.b, isian, dan aksi API (saveMK, deleteMK,
// saveMBKM, deleteMBKM) tidak berubah. Perbedaan: formulir tambah tidak lagi terisi contoh data (asal: 2/1 SKS,
// "CPL-01, CPL-03", mitra "PT Telekomunikasi Indonesia", 20 SKS, "Dosen Pembimbing"); contoh menjadi placeholder.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Rocket } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import {
  Angka, BarisAngka, KartuHitung, KartuTabel, KosongArahan, namaDariAlamatBukti, TautanBukti, TombolHapus,
} from "@/modules/lkps/komponen/bersama/ui-lkps";

interface MKRow {
  id: string;
  kode: string;
  nama: string;
  sksTeori: number;
  sksPraktikum: number;
  cpl: string;
  linkRps: string | null;
  fileRps?: string | null;
  unitPenyelenggara: string;
}

interface MBKMRow {
  id: string;
  namaMahasiswa: string;
  nim: string;
  namaMitra: string;
  sksKonversi: number;
  dosenPembimbing: string;
  tahun: number;
}

export default function HalamanPendidikan() {
  const { canEdit } = useModulePermission("pendidikan");
  const [mkList, setMkList] = useState<MKRow[]>([]);
  const [mbkmList, setMbkmList] = useState<MBKMRow[]>([]);
  const [editingMk, setEditingMk] = useState<MKRow | null>(null);
  const [editingMbkm, setEditingMbkm] = useState<MBKMRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await kirimLkps("/api/lkps/pendidikan");
      if (res.ok) {
        const data = await res.json();
        setMkList(data.mk || []);
        setMbkmList(data.mbkm || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Hitungan kode asal (tanpa perubahan)
  const totalSksTeori = mkList.reduce((a, m) => a + (m.sksTeori || 0), 0);
  const totalSksPraktikum = mkList.reduce((a, m) => a + (m.sksPraktikum || 0), 0);
  const totalSks = totalSksTeori + totalSksPraktikum;
  const persenPraktikum = totalSks > 0 ? (totalSksPraktikum / totalSks) * 100 : 0;

  async function aksi(action: string, payload: unknown, sukses: string, tutup?: () => void) {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/pendidikan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      if (res.ok) {
        await fetchData();
        tutup?.();
        toast.success(sukses);
      }
    } finally {
      setSaving(false);
    }
  }

  const ubahMk = (p: Partial<MKRow>) => setEditingMk((m) => (m ? { ...m, ...p } : m));
  const ubahMbkm = (p: Partial<MBKMRow>) => setEditingMbkm((m) => (m ? { ...m, ...p } : m));
  const kosong = (judul: string, arahan: string) => (
    <KosongArahan nomor={5} judul={loading ? "Memuat data…" : judul}>{!loading && (canEdit ? arahan : "Tim Prodi belum mengisi tabel ini.")}</KosongArahan>
  );
  const aksiBaris = (onUbah: () => void, judul: string, onHapus: () => void, nama: string) => canEdit && (
    <TableCell className="pr-6 text-right whitespace-nowrap">
      <Button size="icon" variant="ghost" aria-label={`Ubah ${nama}`} onClick={onUbah}><Pencil aria-hidden /></Button>
      <TombolHapus label={`Hapus ${nama}`} judul={judul} deskripsi={nama} onHapus={onHapus} />
    </TableCell>
  );

  return (
    <>
      <JudulHalaman judul="Kriteria 5: Pendidikan" deskripsi="Tabel 5.a.1 dan 5.b LKPS: struktur kurikulum dan program MBKM." />
      <RoleNotice module="pendidikan" />

      <KartuHitung
        judul="Struktur kurikulum dan praktikum"
        deskripsi="Matriks Penilaian Kurikulum Diploma III / Vokasi Teknik; dihitung langsung dari tabel di bawah."
        skor={<Badge className="h-7 px-2.5 text-sm">Total: {totalSks} SKS</Badge>}
      >
        <BarisAngka>
          <Angka label="SKS teori" nilai={`${totalSksTeori} SKS`} nada="text-blue-700 dark:text-blue-300" />
          <Angka label="SKS praktikum/lapangan" nilai={`${totalSksPraktikum} SKS (${persenPraktikum.toFixed(1)}%)`} nada="text-emerald-700 dark:text-emerald-300" />
          <Angka label="Peserta MBKM terdaftar" nilai={mbkmList.length} nada="text-violet-700 dark:text-violet-300" />
        </BarisAngka>
      </KartuHitung>

      <Tabs defaultValue="mk" className="gap-4">
        <TabsList>
          <TabsTrigger value="mk"><BookOpen aria-hidden />Tabel 5.a.1 · Kurikulum</TabsTrigger>
          <TabsTrigger value="mbkm"><Rocket aria-hidden />Tabel 5.b · MBKM</TabsTrigger>
        </TabsList>

        <TabsContent value="mk">
          <KartuTabel
            nomor={5} judul="Tabel 5.a.1 · Struktur kurikulum" deskripsi={`${mkList.length} mata kuliah`}
            aksi={canEdit && (
              <Button onClick={() => setEditingMk({ id: `temp_${Date.now()}`, kode: "", nama: "", sksTeori: 0, sksPraktikum: 0, cpl: "", linkRps: "", unitPenyelenggara: "Prodi" })}>
                <Plus aria-hidden />Tambah mata kuliah
              </Button>
            )}
          >
            {mkList.length === 0 ? kosong("Belum ada data mata kuliah", "Klik Tambah mata kuliah untuk mengisi struktur kurikulum.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Mata kuliah</TableHead>
                    <TableHead>SKS (T/P)</TableHead>
                    <TableHead>CPL dipetakan</TableHead>
                    <TableHead>Unit penyelenggara</TableHead>
                    <TableHead>RPS</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mkList.map((m, i) => {
                    const rps = m.linkRps || m.fileRps || null;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{m.kode}</TableCell>
                        <TableCell className="font-medium">{m.nama}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{m.sksTeori} / {m.sksPraktikum} SKS</TableCell>
                        <TableCell>{m.cpl ? <Badge variant="secondary" className="whitespace-normal">{m.cpl}</Badge> : "–"}</TableCell>
                        <TableCell>{m.unitPenyelenggara}</TableCell>
                        <TableCell><TautanBukti url={rps} nama={m.linkRps ? "Lihat RPS" : namaDariAlamatBukti(m.fileRps)} /></TableCell>
                        {aksiBaris(() => setEditingMk({ ...m, linkRps: m.linkRps ?? "" }), "Hapus mata kuliah ini?", () => void aksi("deleteMK", { id: m.id }, "Mata kuliah dihapus."), m.nama)}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>

        <TabsContent value="mbkm">
          <KartuTabel
            nomor={5} judul="Tabel 5.b · Penyelenggaraan MBKM" deskripsi="Magang industri, pertukaran pelajar, dan riset."
            aksi={canEdit && (
              <Button onClick={() => setEditingMbkm({ id: `temp_${Date.now()}`, namaMahasiswa: "", nim: "", namaMitra: "", sksKonversi: 0, dosenPembimbing: "", tahun: new Date().getFullYear() })}>
                <Plus aria-hidden />Tambah peserta MBKM
              </Button>
            )}
          >
            {mbkmList.length === 0 ? kosong("Belum ada data peserta MBKM", "Klik Tambah peserta MBKM untuk mengisi data mahasiswa.") : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">No</TableHead>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Mitra MBKM</TableHead>
                    <TableHead>SKS konversi</TableHead>
                    <TableHead>Dosen pembimbing</TableHead>
                    <TableHead>Tahun</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mbkmList.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{b.namaMahasiswa}</TableCell>
                      <TableCell className="tabular-nums">{b.nim}</TableCell>
                      <TableCell><Badge variant="outline">{b.namaMitra}</Badge></TableCell>
                      <TableCell className="tabular-nums">{b.sksKonversi} SKS</TableCell>
                      <TableCell>{b.dosenPembimbing}</TableCell>
                      <TableCell className="tabular-nums">{b.tahun}</TableCell>
                      {aksiBaris(() => setEditingMbkm({ ...b }), "Hapus peserta MBKM ini?", () => void aksi("deleteMBKM", { id: b.id }, "Peserta MBKM dihapus."), b.namaMahasiswa)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuTabel>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingMk) && canEdit} onOpenChange={(b) => !b && setEditingMk(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMk?.id.startsWith("temp_") ? "Tambah mata kuliah" : "Ubah mata kuliah"}</DialogTitle>
            <DialogDescription>Kode dan nama mata kuliah wajib diisi.</DialogDescription>
          </DialogHeader>
          {editingMk && (
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <Field><FieldLabel htmlFor="mk-kode">Kode</FieldLabel><Input id="mk-kode" placeholder="TIF101" value={editingMk.kode} onChange={(e) => ubahMk({ kode: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="mk-nama">Nama mata kuliah</FieldLabel><Input id="mk-nama" value={editingMk.nama} onChange={(e) => ubahMk({ nama: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="mk-t">SKS teori</FieldLabel><Input id="mk-t" type="number" min={0} step={0.5} value={editingMk.sksTeori} onChange={(e) => ubahMk({ sksTeori: parseFloat(e.target.value) || 0 })} /></Field>
                <Field><FieldLabel htmlFor="mk-p">SKS praktikum</FieldLabel><Input id="mk-p" type="number" min={0} step={0.5} value={editingMk.sksPraktikum} onChange={(e) => ubahMk({ sksPraktikum: parseFloat(e.target.value) || 0 })} /></Field>
              </div>
              <Field><FieldLabel htmlFor="mk-cpl">Pemetaan capaian pembelajaran (CPL)</FieldLabel><Input id="mk-cpl" placeholder="Contoh: CPL-01, CPL-03" value={editingMk.cpl} onChange={(e) => ubahMk({ cpl: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="mk-rps">Tautan dokumen RPS</FieldLabel><Input id="mk-rps" type="url" placeholder="https://drive.google.com/…" value={editingMk.linkRps ?? ""} onChange={(e) => ubahMk({ linkRps: e.target.value })} /></Field>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMk(null)}>Batal</Button>
            <Button disabled={saving} onClick={() => editingMk && void aksi("saveMK", editingMk, "Mata kuliah tersimpan.", () => setEditingMk(null))}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingMbkm) && canEdit} onOpenChange={(b) => !b && setEditingMbkm(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMbkm?.id.startsWith("temp_") ? "Tambah peserta MBKM" : "Ubah peserta MBKM"}</DialogTitle>
            <DialogDescription>Semua isian wajib diisi.</DialogDescription>
          </DialogHeader>
          {editingMbkm && (
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="mbkm-nama">Nama mahasiswa</FieldLabel><Input id="mbkm-nama" value={editingMbkm.namaMahasiswa} onChange={(e) => ubahMbkm({ namaMahasiswa: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="mbkm-nim">NIM</FieldLabel><Input id="mbkm-nim" value={editingMbkm.nim} onChange={(e) => ubahMbkm({ nim: e.target.value })} /></Field>
              </div>
              <Field><FieldLabel htmlFor="mbkm-mitra">Mitra penyelenggara MBKM</FieldLabel><Input id="mbkm-mitra" placeholder="Contoh: PT PLN (Persero)" value={editingMbkm.namaMitra} onChange={(e) => ubahMbkm({ namaMitra: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-[8rem_1fr_7rem]">
                <Field><FieldLabel htmlFor="mbkm-sks">SKS konversi</FieldLabel><Input id="mbkm-sks" type="number" min={0} value={editingMbkm.sksKonversi} onChange={(e) => ubahMbkm({ sksKonversi: parseFloat(e.target.value) || 0 })} /></Field>
                <Field><FieldLabel htmlFor="mbkm-dpl">Dosen pembimbing lapangan</FieldLabel><Input id="mbkm-dpl" value={editingMbkm.dosenPembimbing} onChange={(e) => ubahMbkm({ dosenPembimbing: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="mbkm-tahun">Tahun</FieldLabel><Input id="mbkm-tahun" type="number" value={editingMbkm.tahun} onChange={(e) => ubahMbkm({ tahun: parseInt(e.target.value) || 0 })} /></Field>
              </div>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMbkm(null)}>Batal</Button>
            <Button disabled={saving} onClick={() => editingMbkm && void aksi("saveMBKM", editingMbkm, "Peserta MBKM tersimpan.", () => setEditingMbkm(null))}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
