"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaFakultas, type MasukanFakultas } from "@/lib/validasi";
import { aksiSimpanFakultas } from "./aksi";

const KOLOM: { name: keyof MasukanFakultas; label: string; contoh?: string; lebar?: boolean }[] = [
  { name: "nama", label: "Nama fakultas", contoh: "contoh: Fakultas Teknik" },
  { name: "perguruanTinggi", label: "Perguruan tinggi", contoh: "contoh: Universitas Lampung" },
  { name: "alamat", label: "Alamat", lebar: true },
  { name: "kota", label: "Kota kedudukan perguruan tinggi", contoh: "contoh: Bandar Lampung" },
];

/** Identitas fakultas (pengganti UPPS), diisi sekali dan dipakai di halaman identitas semua LED. */
export function FormFakultas({ awal }: { awal: MasukanFakultas }) {
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanFakultas>({ resolver: zodResolver(skemaFakultas), defaultValues: awal });
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((nilai) => jalankan(() => aksiSimpanFakultas(nilai), { sukses: "Identitas fakultas disimpan." }))}
      className="grid gap-4 sm:grid-cols-2"
    >
      {KOLOM.map((k) => (
        <Controller
          key={k.name}
          name={k.name}
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={k.lebar ? "sm:col-span-2" : undefined}>
              <FieldLabel htmlFor={`fakultas-${k.name}`}>{k.label}</FieldLabel>
              <Input {...field} value={field.value ?? ""} id={`fakultas-${k.name}`} placeholder={k.contoh} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      ))}
      <Button type="submit" disabled={sibuk} className="w-fit">
        <IkonSibuk sibuk={sibuk} />
        Simpan identitas fakultas
      </Button>
    </form>
  );
}
