"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/identitas/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, identitas PT/UPPS dan prodi dari data LED (hanya baca), tim penyusun tetap diisi.
// Gabung LKPS G7: dibuat ulang dengan komponen LED (Tabs, Card, Table, Input, Select, Button, Petunjuk, toast).
// Perbedaan tampilan: identitas hanya baca ditampilkan sebagai daftar data (bukan isian nonaktif); kolom "Jumlah
// mahasiswa aktif" dibuang (tidak disimpan, keputusan G0 no. 4); tombol "Upload TTD" kini benar-benar mengunggah
// gambar tanda tangan ke bukti prodi (kode asal: tombol tanpa aksi). Perilaku simpan sama: ganti semua tim penyusun.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, GraduationCap, Loader2, Plus, Save, Trash2, Upload, Users } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";

interface IdentitasPT {
  namaPT: string;
  namaUPPS: string;
  jenisProgram: string;
  namaProdi: string;
  alamat: string;
  noSkPendirianPT: string | null;
  tanggalSkPT: string | null;
  noSkPembukaanPS: string | null;
  tanggalSkPS: string | null;
}

interface ProdiRow {
  id: string;
  namaProdi: string;
  jenjang: string;
  peringkatAkreditasi: string | null;
}

interface TimRow {
  id: string;
  nama: string;
  nidn: string;
  jabatan: string;
  fotoTtd: string | null;
}

const JABATAN = ["Ketua Tim Penyusun", "Sekretaris", "Anggota Tim", "Ketua Program Studi", "Dekan/Wakil Dekan"];
const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" });

function tanggal(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : fmtTanggal.format(d);
}

function Data({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children || <span className="font-normal text-muted-foreground">Belum diisi</span>}</dd>
    </div>
  );
}

const timKosong = (): TimRow => ({ id: `baru-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nama: "", nidn: "", jabatan: "", fotoTtd: null });

export default function HalamanIdentitas() {
  const { canEdit } = useModulePermission("identitas");
  const { peran } = useInfoLkps();
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengunggah, setMengunggah] = useState<string | null>(null);
  const [identitas, setIdentitas] = useState<IdentitasPT | null>(null);
  const [prodiList, setProdiList] = useState<ProdiRow[]>([]);
  const [timList, setTimList] = useState<TimRow[]>([timKosong()]);

  const muat = useCallback(async () => {
    try {
      const res = await kirimLkps("/api/lkps/identitas");
      if (!res.ok) return;
      const data = await res.json();
      setIdentitas(data.identitas ?? null);
      setProdiList(Array.isArray(data.prodiList) ? data.prodiList : []);
      if (Array.isArray(data.timList) && data.timList.length > 0) {
        setTimList(data.timList.map((t: Partial<TimRow>) => ({
          id: String(t.id), nama: t.nama ?? "", nidn: t.nidn ?? "", jabatan: t.jabatan || "Anggota Tim", fotoTtd: t.fotoTtd ?? null,
        })));
      }
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const ubahTim = (id: string, kolom: keyof TimRow, nilai: string | null) =>
    setTimList((l) => l.map((t) => (t.id === id ? { ...t, [kolom]: nilai } : t)));

  async function unggahTtd(id: string, berkas: File | undefined) {
    if (!berkas) return;
    setMengunggah(id);
    try {
      const fd = new FormData();
      fd.append("file", berkas);
      const res = await kirimLkps("/api/lkps/bukti", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = await res.json();
      ubahTim(id, "fotoTtd", data.url);
      toast.success("Tanda tangan diunggah. Klik Simpan untuk menyimpan tim penyusun.");
    } finally {
      setMengunggah(null);
    }
  }

  async function simpan() {
    if (!canEdit) return;
    setMenyimpan(true);
    try {
      const res = await kirimLkps("/api/lkps/identitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // fotoTtd hanya dikirim bila ada (skema: alamat bukti opsional, bukan null)
        body: JSON.stringify({ identitas, prodiList, timList: timList.map(({ fotoTtd, ...t }) => (fotoTtd ? { ...t, fotoTtd } : t)) }),
      });
      if (res.ok) {
        await muat();
        toast.success("Tim penyusun tersimpan.");
      }
    } finally {
      setMenyimpan(false);
    }
  }

  const tautanUbah = peran === "ADMIN"
    ? <>Ubah di <Link href="/pengaturan/institusi" className="font-medium text-primary underline-offset-4 hover:underline">Identitas institusi</Link> atau <Link href="/pengaturan/prodi" className="font-medium text-primary underline-offset-4 hover:underline">Program studi</Link>.</>
    : peran === "TIM_PRODI"
      ? <>Ubah di <Link href="/led/identitas-prodi" className="font-medium text-primary underline-offset-4 hover:underline">Identitas prodi</Link>.</>
      : null;

  return (
    <>
      <JudulHalaman judul="Identitas & Tim Penyusun" deskripsi="Identitas pengusul, program studi di bawah UPPS, dan tim penyusun dokumen LKPS." />
      <RoleNotice module="identitas" />
      <Petunjuk
        kunci="lkps-identitas-led"
        fungsi={<>Identitas institusi dan program studi diambil dari data LED dan hanya dapat dibaca di sini. {tautanUbah}</>}
        langkah={canEdit ? ["Isi tim penyusun di tab Tim Penyusun, unggah tanda tangan bila ada, lalu klik Simpan."] : []}
      />

      <Tabs defaultValue="identitas" className="gap-4">
        <TabsList>
          <TabsTrigger value="identitas"><Building2 aria-hidden />Identitas PT & UPPS</TabsTrigger>
          <TabsTrigger value="prodi"><GraduationCap aria-hidden />Prodi di UPPS</TabsTrigger>
          <TabsTrigger value="tim"><Users aria-hidden />Tim Penyusun</TabsTrigger>
        </TabsList>

        <TabsContent value="identitas">
          <Card>
            <CardHeader>
              <CardTitle>Data identitas PT & UPPS</CardTitle>
              <CardDescription>Sesuai SK pendirian dari Kemendikbudristek.</CardDescription>
            </CardHeader>
            <CardContent>
              {memuat || !identitas ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Data label="Nama perguruan tinggi">{identitas.namaPT}</Data>
                  <Data label="Nama UPPS (fakultas/departemen)">{identitas.namaUPPS}</Data>
                  <Data label="Nama program studi">{identitas.namaProdi}</Data>
                  <Data label="Jenis program">{identitas.jenisProgram}</Data>
                  <Data label="No. SK pendirian PT">{identitas.noSkPendirianPT}</Data>
                  <Data label="Tanggal SK pendirian PT">{tanggal(identitas.tanggalSkPT)}</Data>
                  <Data label="No. SK pembukaan prodi">{identitas.noSkPembukaanPS}</Data>
                  <Data label="Tanggal SK pembukaan prodi">{tanggal(identitas.tanggalSkPS)}</Data>
                  <div className="sm:col-span-2 lg:col-span-3"><Data label="Alamat perguruan tinggi">{identitas.alamat}</Data></div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prodi">
          <Card className="py-0">
            <CardHeader className="pt-6">
              <CardTitle>Program studi di bawah UPPS</CardTitle>
              <CardDescription>Tabel 1: program studi aktif dan status akreditasinya.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-6">No</TableHead>
                    <TableHead>Nama program studi</TableHead>
                    <TableHead>Jenjang</TableHead>
                    <TableHead className="pr-6">Peringkat akreditasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prodiList.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="pl-6 text-muted-foreground">{memuat ? "Memuat…" : "Belum ada program studi."}</TableCell></TableRow>
                  )}
                  {prodiList.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.namaProdi}</TableCell>
                      <TableCell>{namaJenjang(p.jenjang)}</TableCell>
                      <TableCell className="pr-6">{p.peringkatAkreditasi ? <Badge variant="secondary">{p.peringkatAkreditasi}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tim">
          <Card className="py-0">
            <CardHeader className="pt-6">
              <CardTitle>Tim penyusun dokumen LKPS</CardTitle>
              <CardDescription>Anggota tim penyusun beserta jabatan dan tanda tangan.</CardDescription>
              {canEdit && (
                <CardAction>
                  <Button size="sm" onClick={() => setTimList((l) => [...l, timKosong()])}><Plus aria-hidden />Tambah anggota</Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-6">No</TableHead>
                    <TableHead className="min-w-44">Nama lengkap</TableHead>
                    <TableHead className="min-w-32">NIDN/NIP</TableHead>
                    <TableHead className="min-w-40">Jabatan dalam tim</TableHead>
                    <TableHead>Tanda tangan</TableHead>
                    {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timList.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        {canEdit
                          ? <Input aria-label={`Nama anggota ${i + 1}`} placeholder="Nama dosen/staf" value={t.nama} onChange={(e) => ubahTim(t.id, "nama", e.target.value)} />
                          : t.nama || "—"}
                      </TableCell>
                      <TableCell>
                        {canEdit
                          ? <Input aria-label={`NIDN/NIP anggota ${i + 1}`} placeholder="0000000000" inputMode="numeric" value={t.nidn} onChange={(e) => ubahTim(t.id, "nidn", e.target.value)} />
                          : t.nidn || "—"}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select value={t.jabatan || undefined} onValueChange={(v) => ubahTim(t.id, "jabatan", v)}>
                            <SelectTrigger className="w-full" aria-label={`Jabatan anggota ${i + 1}`}><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                            <SelectContent>{JABATAN.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (t.jabatan || "—")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {t.fotoTtd
                            ? <a href={t.fotoTtd} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Lihat</a>
                            : <span className="text-sm text-muted-foreground">Belum ada</span>}
                          {canEdit && (
                            <Button asChild size="sm" variant="outline">
                              <label className={mengunggah === t.id ? "pointer-events-none cursor-wait opacity-60" : "cursor-pointer"}>
                                {mengunggah === t.id ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
                                {t.fotoTtd ? "Ganti" : "Unggah"}
                                <input
                                  type="file" accept="image/png,image/jpeg" className="sr-only" aria-label={`Unggah tanda tangan anggota ${i + 1}`}
                                  onChange={(e) => void unggahTtd(t.id, e.target.files?.[0])}
                                />
                              </label>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="pr-6 text-right">
                          <Button
                            size="icon" variant="ghost" aria-label={`Hapus anggota ${i + 1}`} disabled={timList.length === 1}
                            onClick={() => setTimList((l) => l.filter((x) => x.id !== t.id))}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {canEdit && (
            <div className="mt-4 flex justify-end">
              <Button onClick={simpan} disabled={menyimpan}>
                {menyimpan ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                {menyimpan ? "Menyimpan…" : "Simpan tim penyusun"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
