"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiUbahBagian } from "@/app/admin/aksi";

interface Nilai {
  nama: string;
  urutan: number;
  batasHalamanResmi: number | null;
  pengantar: string;
}

export function FormBagian({ id, terkunci, awal }: { id: string; terkunci: boolean; awal: Nilai }) {
  const [n, setN] = useState(awal);
  const { sibuk, jalankan } = useAksi();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiUbahBagian(id, n), { sukses: "Bagian disimpan." });
      }}
    >
      <fieldset disabled={terkunci || sibuk}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="bagian-nama">Nama</FieldLabel>
            <Input id="bagian-nama" value={n.nama} onChange={(e) => setN({ ...n, nama: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="bagian-urutan">Urutan</FieldLabel>
              <Input id="bagian-urutan" type="number" min={0} value={n.urutan} onChange={(e) => setN({ ...n, urutan: Number(e.target.value) })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="bagian-batas">Batas halaman resmi</FieldLabel>
              <Input
                id="bagian-batas"
                type="number"
                min={0}
                value={n.batasHalamanResmi ?? ""}
                onChange={(e) => setN({ ...n, batasHalamanResmi: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="bagian-pengantar">Pengantar</FieldLabel>
            <Textarea id="bagian-pengantar" rows={5} value={n.pengantar} onChange={(e) => setN({ ...n, pengantar: e.target.value })} />
            <FieldDescription>Teks pembuka bagian dari template (bila ada).</FieldDescription>
          </Field>
          {!terkunci && (
            <Button type="submit" className="w-fit">
              <IkonSibuk sibuk={sibuk} />
              Simpan bagian
            </Button>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}
