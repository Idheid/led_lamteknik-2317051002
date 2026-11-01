"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Building2, Pencil } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaFakultas, type MasukanFakultas } from "@/modules/bersama/validasi";
import { aksiSimpanFakultas } from "./aksi";

const KOLOM: { name: keyof MasukanFakultas; label: string; contoh?: string; lebar?: boolean }[] = [
  { name: "nama", label: "Nama UPPS (fakultas)", contoh: "contoh: Fakultas Teknik" },
  { name: "perguruanTinggi", label: "Perguruan tinggi", contoh: "contoh: Universitas Lampung" },
  { name: "alamat", label: "Alamat", lebar: true },
  { name: "kota", label: "Kota kedudukan perguruan tinggi", contoh: "contoh: Bandar Lampung" },
];

/**
 * Identitas UPPS untuk dokumen LED (perbaikan atas pertanyaan Adrianne, 2 Nov 2026): nama UPPS, perguruan tinggi, alamat,
 * dan kota dicetak di halaman muka dan tabel identitas LED serta dipakai prompt narasi. Sudah terisi bawaan (Fakultas
 * Teknik, Universitas Lampung), jadi di halaman Program studi hanya tampil satu baris ringkas; formnya di dialog Ubah.
 */
export function IdentitasUpps({ awal }: { awal: MasukanFakultas }) {
  const [buka, setBuka] = useState(false);
  const ringkas = [awal.nama, awal.perguruanTinggi, awal.kota].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Building2 className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="text-muted-foreground">Identitas di sampul LED:</span>
        <span className="font-medium">{ringkas || "Belum diisi"}</span>
      </span>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline"><Pencil aria-hidden />Ubah</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Identitas UPPS di dokumen LED</DialogTitle>
            <DialogDescription>
              Dicetak di halaman muka dan tabel identitas semua LED. Isi sekali; ubah hanya bila nama atau alamat berubah.
            </DialogDescription>
          </DialogHeader>
          <FormFakultas awal={awal} lalu={() => setBuka(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormFakultas({ awal, lalu }: { awal: MasukanFakultas; lalu: () => void }) {
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanFakultas>({ resolver: zodResolver(skemaFakultas), defaultValues: awal });
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((nilai) => jalankan(() => aksiSimpanFakultas(nilai), { sukses: "Identitas UPPS disimpan.", lalu }))}
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
        Simpan
      </Button>
    </form>
  );
}
