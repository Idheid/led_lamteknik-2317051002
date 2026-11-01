"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiUbahVersi } from "@/app/led/(admin)/instrumen/aksi";

export function FormVersi({
  id, terkunci, aktif, awal,
}: { id: string; terkunci: boolean; aktif: boolean; awal: { nama: string; kode: string; catatan: string; tahunInstrumen: number } }) {
  const [nilai, setNilai] = useState({ ...awal, tahunInstrumen: String(awal.tahunInstrumen) });
  const { sibuk, jalankan } = useAksi();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiUbahVersi(id, { ...nilai, tahunInstrumen: Number(nilai.tahunInstrumen) }), { sukses: "Identitas versi disimpan." });
      }}
    >
      <fieldset disabled={terkunci || sibuk}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="versi-nama">Nama</FieldLabel>
            <Input id="versi-nama" value={nilai.nama} onChange={(e) => setNilai({ ...nilai, nama: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="versi-tahun">Tahun instrumen</FieldLabel>
            <Input
              id="versi-tahun" inputMode="numeric" className="w-32 max-w-32 tabular-nums" value={nilai.tahunInstrumen} disabled={aktif}
              onChange={(e) => setNilai({ ...nilai, tahunInstrumen: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
            {aktif && <FieldDescription>Tidak bisa diubah karena versi ini sudah aktif.</FieldDescription>}
          </Field>
          <Field>
            <FieldLabel htmlFor="versi-kode">Kode</FieldLabel>
            <Input id="versi-kode" className="font-mono" value={nilai.kode} onChange={(e) => setNilai({ ...nilai, kode: e.target.value.toUpperCase() })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="versi-catatan">Catatan</FieldLabel>
            <Textarea id="versi-catatan" rows={4} value={nilai.catatan} onChange={(e) => setNilai({ ...nilai, catatan: e.target.value })} />
          </Field>
          {!terkunci && (
            <Button type="submit" className="w-fit">
              <IkonSibuk sibuk={sibuk} />
              Simpan identitas
            </Button>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}
