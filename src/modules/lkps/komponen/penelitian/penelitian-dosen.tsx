"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/penelitian/page.tsx dan
// src/app/(dashboard)/pkm/page.tsx (dua halaman yang isinya sama kecuali teks dan alamat API).
// Gabung LKPS G7: digabung menjadi satu komponen dengan komponen LED (Table, Dialog, Field, AlertDialog, toast).
// Isi kartu hitungan, kolom tabel, isian, dan aksi API (save/delete) tidak berubah.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import { Angka, BarisAngka, KartuHitung, KartuTabel, KosongArahan, TombolHapus } from "@/modules/lkps/komponen/bersama/ui-lkps";

interface BarisPenelitian {
  id: string;
  judul: string;
  namaDosen: string;
  mahasiswaTerlibat: string;
  tahun: number;
}

const TEKS = {
  Penelitian: {
    nomor: 6, modul: "penelitian" as const, api: "/api/lkps/penelitian",
    judulHalaman: "Kriteria 6: Penelitian Dosen & Mahasiswa",
    deskripsi: "Tabel 6.a dan 6.b LKPS: penelitian dosen tetap (DTPS) yang melibatkan mahasiswa aktif program studi.",
    kartu: "Pelibatan mahasiswa dalam penelitian dosen", tabel: "Daftar penelitian dosen (Tabel 6.a LKPS)",
    kolomJudul: "Judul penelitian", kolomDosen: "Dosen tetap", isianDosen: "Nama dosen peneliti", kegiatan: "penelitian",
  },
  PkM: {
    nomor: 7, modul: "pkm" as const, api: "/api/lkps/pkm",
    judulHalaman: "Kriteria 7: Pengabdian kepada Masyarakat (PkM)",
    deskripsi: "Tabel 7 LKPS: pengabdian kepada masyarakat dosen tetap (DTPS) yang melibatkan mahasiswa aktif.",
    kartu: "Pelibatan mahasiswa dalam PkM dosen", tabel: "Daftar PkM dosen (Tabel 7 LKPS)",
    kolomJudul: "Judul kegiatan PkM", kolomDosen: "Dosen pengabdi", isianDosen: "Nama dosen pengabdi", kegiatan: "PkM",
  },
};

export function HalamanPenelitianDosen({ jenis }: { jenis: keyof typeof TEKS }) {
  const t = TEKS[jenis];
  const { canEdit } = useModulePermission(t.modul);
  const [list, setList] = useState<BarisPenelitian[]>([]);
  const [editing, setEditing] = useState<BarisPenelitian | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await kirimLkps(t.api);
      if (res.ok) setList((await res.json()) || []);
    } finally {
      setLoading(false);
    }
  }, [t.api]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function aksi(action: "save" | "delete", payload: unknown, sukses: string) {
    setSaving(true);
    try {
      const res = await kirimLkps(t.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      if (res.ok) {
        await fetchData();
        setEditing(null);
        toast.success(sukses);
      }
    } finally {
      setSaving(false);
    }
  }

  const ubah = (p: Partial<BarisPenelitian>) => setEditing((e) => (e ? { ...e, ...p } : e));
  const terlibat = list.filter((p) => (p.mahasiswaTerlibat ?? "").trim().length > 0).length;
  const baru = editing ? editing.id.startsWith("temp_") : true;

  return (
    <>
      <JudulHalaman judul={t.judulHalaman} deskripsi={t.deskripsi} />
      <RoleNotice module={t.modul} />

      <KartuHitung
        judul={t.kartu}
        deskripsi="Matriks Penilaian LAM Teknik; dihitung langsung dari tabel di bawah."
        skor={<Badge className="h-7 px-2.5 text-sm">Total {t.kegiatan}: {list.length} kegiatan</Badge>}
      >
        <BarisAngka>
          <Angka label={`Total ${t.kegiatan}`} nilai={list.length} />
          <Angka label="Melibatkan mahasiswa" nilai={terlibat} nada="text-emerald-700 dark:text-emerald-300" />
        </BarisAngka>
      </KartuHitung>

      <KartuTabel
        nomor={t.nomor} judul={t.tabel} deskripsi={`${list.length} data ${t.kegiatan}`}
        aksi={canEdit && (
          <Button onClick={() => setEditing({ id: `temp_${Date.now()}`, judul: "", namaDosen: "", mahasiswaTerlibat: "", tahun: new Date().getFullYear() })}>
            <Plus aria-hidden />Tambah {t.kegiatan}
          </Button>
        )}
      >
        {list.length === 0 ? (
          <KosongArahan nomor={t.nomor} judul={loading ? "Memuat data…" : `Belum ada data ${t.kegiatan} dosen`}>
            {!loading && (canEdit ? `Klik Tambah ${t.kegiatan} untuk memasukkan judul ${t.kegiatan} dosen.` : "Tim Prodi belum mengisi tabel ini.")}
          </KosongArahan>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">No</TableHead>
                <TableHead>{t.kolomJudul}</TableHead>
                <TableHead>{t.kolomDosen}</TableHead>
                <TableHead>Mahasiswa terlibat</TableHead>
                <TableHead>Tahun</TableHead>
                {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="max-w-80 font-medium whitespace-normal">{r.judul}</TableCell>
                  <TableCell>{r.namaDosen}</TableCell>
                  <TableCell className="max-w-60 whitespace-normal">{r.mahasiswaTerlibat || <span className="text-muted-foreground">Tidak ada</span>}</TableCell>
                  <TableCell className="tabular-nums">{r.tahun}</TableCell>
                  {canEdit && (
                    <TableCell className="pr-6 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" aria-label={`Ubah ${r.judul}`} onClick={() => setEditing({ ...r, mahasiswaTerlibat: r.mahasiswaTerlibat ?? "" })}><Pencil aria-hidden /></Button>
                      <TombolHapus label={`Hapus ${r.judul}`} judul={`Hapus data ${t.kegiatan} ini?`} deskripsi={r.judul} onHapus={() => void aksi("delete", { id: r.id }, `Data ${t.kegiatan} dihapus.`)} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KartuTabel>

      <Dialog open={Boolean(editing) && canEdit} onOpenChange={(b) => !b && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{baru ? `Tambah ${t.kegiatan}` : `Ubah ${t.kegiatan}`}</DialogTitle>
            <DialogDescription>Judul, nama dosen, dan tahun wajib diisi.</DialogDescription>
          </DialogHeader>
          {editing && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pen-judul">{t.kolomJudul}</FieldLabel>
                <Textarea id="pen-judul" rows={2} value={editing.judul} onChange={(e) => ubah({ judul: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Field>
                  <FieldLabel htmlFor="pen-dosen">{t.isianDosen}</FieldLabel>
                  <Input id="pen-dosen" placeholder="Dr. Eng. Nama Dosen" value={editing.namaDosen} onChange={(e) => ubah({ namaDosen: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pen-tahun">Tahun</FieldLabel>
                  <Input id="pen-tahun" type="number" value={editing.tahun} onChange={(e) => ubah({ tahun: parseInt(e.target.value) || 0 })} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="pen-mhs">Mahasiswa yang dilibatkan (nama / NIM)</FieldLabel>
                <Input id="pen-mhs" placeholder="Kosongkan bila tidak ada" value={editing.mahasiswaTerlibat} onChange={(e) => ubah({ mahasiswaTerlibat: e.target.value })} />
              </Field>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={saving} onClick={() => editing && void aksi("save", editing, `Data ${t.kegiatan} tersimpan.`)}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
