"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { labelPeriode } from "@/modules/bersama/domain/tahun-akademik";
import { aksiUbahTahunPengajuan } from "../aksi";

/** Ubah tahun pengajuan (label periode 5 tahun). TS tidak ikut berubah; atur di Pengaturan LED bila perlu. */
export function DialogUbahTahun({ proyekId, tahunPengajuan }: { proyekId: string; tahunPengajuan: number }) {
  const [buka, setBuka] = useState(false);
  const [tahun, setTahun] = useState(String(tahunPengajuan));
  const { sibuk, jalankan } = useAksi();
  const n = Number(tahun);
  const sah = Number.isInteger(n) && n >= 2000 && n <= 2100;
  return (
    <Dialog open={buka} onOpenChange={(b) => { setBuka(b); setTahun(String(tahunPengajuan)); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ubah tahun pengajuan">
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah tahun pengajuan</DialogTitle>
          <DialogDescription>Satu LED berlaku 5 tahun sejak tahun pengajuan akreditasi.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="ubah-tahun">Tahun pengajuan</FieldLabel>
          <Input id="ubah-tahun" type="number" min={2000} max={2100} className="w-32" value={tahun} onChange={(e) => setTahun(e.target.value)} />
          <FieldDescription>{sah ? labelPeriode(n) : "Isi tahun empat angka."}</FieldDescription>
        </Field>
        <DialogFooter>
          <Button
            disabled={!sah || sibuk || n === tahunPengajuan}
            onClick={() => jalankan(() => aksiUbahTahunPengajuan(proyekId, n), { sukses: "Tahun pengajuan diubah.", lalu: () => setBuka(false) })}
          >
            <IkonSibuk sibuk={sibuk} />
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
