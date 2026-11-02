"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aksiSimpanTim } from "@/app/led/(tim-prodi)/aksi";

interface Anggota {
  nama: string;
  nomorInduk: string;
  jabatan: string;
  tugas: string;
}

const KOSONG: Anggota = { nama: "", nomorInduk: "", jabatan: "", tugas: "" };

function DaftarAnggota({
  judul, deskripsi, labelNomor, isi, ubah,
}: { judul: string; deskripsi: string; labelNomor: string; isi: Anggota[]; ubah: (v: Anggota[]) => void }) {
  const setel = (i: number, kunci: keyof Anggota, nilai: string) => ubah(isi.map((a, k) => (k === i ? { ...a, [kunci]: nilai } : a)));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{judul}</CardTitle>
        <CardDescription>{deskripsi}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isi.length === 0 && <p className="text-sm text-muted-foreground">Belum ada anggota.</p>}
        {isi.map((a, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[2rem_1fr_1fr_1fr_auto] sm:items-start">
            <span className="pt-2 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
            <Input aria-label={`Nama anggota ${i + 1}`} placeholder="Nama lengkap dan gelar" value={a.nama} onChange={(e) => setel(i, "nama", e.target.value)} />
            <Input aria-label={`${labelNomor} anggota ${i + 1}`} placeholder={labelNomor} value={a.nomorInduk} onChange={(e) => setel(i, "nomorInduk", e.target.value)} />
            <Input aria-label={`Jabatan anggota ${i + 1}`} placeholder="Jabatan di tim" value={a.jabatan} onChange={(e) => setel(i, "jabatan", e.target.value)} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus anggota ${i + 1}`} onClick={() => ubah(isi.filter((_, k) => k !== i))}>
              <Trash2 />
            </Button>
            <Textarea
              aria-label={`Deskripsi kerja anggota ${i + 1}`}
              placeholder="Deskripsi kerja (misalnya: menyusun kriteria C.1–C.3)"
              rows={2}
              className="sm:col-span-3 sm:col-start-2"
              value={a.tugas}
              onChange={(e) => setel(i, "tugas", e.target.value)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => ubah([...isi, { ...KOSONG }])}>
          <Plus aria-hidden />
          Tambah anggota
        </Button>
      </CardContent>
    </Card>
  );
}

export function FormTim({ proyekId, awal }: { proyekId: string; awal: { dosen: Anggota[]; tendik: Anggota[] } }) {
  const [dosen, setDosen] = useState(awal.dosen);
  const [tendik, setTendik] = useState(awal.tendik);
  const { sibuk, jalankan } = useAksi();
  const bersih = (x: Anggota[]) => x.filter((a) => a.nama.trim() || a.nomorInduk.trim() || a.jabatan.trim() || a.tugas.trim());
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiSimpanTim(proyekId, { dosen: bersih(dosen), tendik: bersih(tendik) }), { sukses: "Tim penyusun disimpan." });
      }}
    >
      <DaftarAnggota
        judul="Tim dosen (Tabel 2.1 dan identitas tim penyusun)"
        deskripsi="Dosen pertama dianggap ketua tim. Setiap dosen mendapat blok identitas dan tanda tangan di halaman Identitas Tim Penyusun."
        labelNomor="NIP / NIDN / NUPTK"
        isi={dosen}
        ubah={setDosen}
      />
      <DaftarAnggota
        judul="Tim tenaga kependidikan (Tabel 2.2)"
        deskripsi="Tenaga kependidikan yang membantu penyusunan LED."
        labelNomor="NIP / NUPTK"
        isi={tendik}
        ubah={setTendik}
      />
      <Button type="submit" disabled={sibuk} className="w-fit">
        <IkonSibuk sibuk={sibuk} />
        Simpan tim penyusun
      </Button>
    </form>
  );
}
