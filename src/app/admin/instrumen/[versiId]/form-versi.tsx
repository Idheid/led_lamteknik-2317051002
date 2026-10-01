"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiUbahVersi } from "../../aksi";

export function FormVersi({
  id, terkunci, awal,
}: { id: string; terkunci: boolean; awal: { nama: string; kode: string; catatan: string } }) {
  const [nilai, setNilai] = useState(awal);
  const { sibuk, jalankan } = useAksi();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiUbahVersi(id, nilai), { sukses: "Identitas versi disimpan." });
      }}
    >
      <fieldset disabled={terkunci || sibuk}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="versi-nama">Nama</FieldLabel>
            <Input id="versi-nama" value={nilai.nama} onChange={(e) => setNilai({ ...nilai, nama: e.target.value })} />
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
