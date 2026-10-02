"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiSimpanPengaturan } from "../aksi";

export function FormModel({ awal }: { awal: { modelNarasi: string; modelEmbedding: string } }) {
  const { sibuk, jalankan } = useAksi();
  const [n, setN] = useState(awal);
  const ganti = n.modelEmbedding.trim() !== awal.modelEmbedding;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiSimpanPengaturan(n), {
          lalu: (diantre) => toast.success(diantre ? `Pengaturan disimpan. ${diantre} dokumen diantre untuk diproses ulang.` : "Pengaturan disimpan."),
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="model-narasi">Model narasi</FieldLabel>
          <Input id="model-narasi" className="font-mono" value={n.modelNarasi} onChange={(e) => setN({ ...n, modelNarasi: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="model-embedding">Model embedding</FieldLabel>
          <Input id="model-embedding" className="font-mono" value={n.modelEmbedding} onChange={(e) => setN({ ...n, modelEmbedding: e.target.value })} />
          <FieldDescription>
            {ganti ? "Menyimpan akan memproses ulang semua dokumen teks di semua proyek." : "Keluaran selalu 768 dimensi (outputDimensionality)."}
          </FieldDescription>
        </Field>
        <Button type="submit" disabled={sibuk} className="w-fit">
          <IkonSibuk sibuk={sibuk} />
          Simpan
        </Button>
      </FieldGroup>
    </form>
  );
}
