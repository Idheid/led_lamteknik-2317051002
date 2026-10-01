"use client";

import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaUpps, type MasukanUpps } from "@/lib/validasi";
import { aksiSimpanUpps } from "../aksi";

export function DialogUpps({ pemicu, awal, id }: { pemicu: ReactNode; awal?: MasukanUpps; id?: string }) {
  const [buka, setBuka] = useState(false);
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanUpps>({
    resolver: zodResolver(skemaUpps),
    defaultValues: awal ?? { kode: "", nama: "", perguruanTinggi: "", alamat: "" },
  });
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiSimpanUpps(nilai, id), {
      sukses: id ? "UPPS diperbarui." : "UPPS ditambahkan.",
      lalu: () => {
        setBuka(false);
        if (!id) form.reset();
      },
    }),
  );
  const kolom = [
    { name: "kode", label: "Kode UPPS", ket: "Samakan dengan sistem LKPS, misalnya FT-UNILA" },
    { name: "nama", label: "Nama UPPS", ket: "Contoh: Fakultas Teknik" },
    { name: "perguruanTinggi", label: "Perguruan tinggi", ket: "Contoh: Universitas Lampung" },
  ] as const;
  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>{pemicu}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{id ? "Ubah UPPS" : "Tambah UPPS"}</DialogTitle>
          <DialogDescription>Unit pengelola program studi, misalnya fakultas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} noValidate>
          <FieldGroup>
            {kolom.map((k) => (
              <Controller
                key={k.name}
                name={k.name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`upps-${k.name}`}>{k.label}</FieldLabel>
                    <Input {...field} id={`upps-${k.name}`} placeholder={k.ket} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
            <Controller
              name="alamat"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="upps-alamat">Alamat (opsional)</FieldLabel>
                  <Textarea {...field} value={field.value ?? ""} id="upps-alamat" rows={2} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={sibuk}>
              <IkonSibuk sibuk={sibuk} />
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
