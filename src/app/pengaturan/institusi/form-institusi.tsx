"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaFakultas, STATUS_PT, type MasukanFakultas } from "@/modules/bersama/validasi";
import { aksiSimpanFakultas } from "../prodi/aksi";

type Kunci = Exclude<keyof MasukanFakultas, "statusPt">;
type Kolom = { name: Kunci; label: string; contoh?: string; lebar?: boolean };

const GRUP: { judul: string; deskripsi: string; kolom: Kolom[]; status?: boolean }[] = [
  {
    judul: "Perguruan tinggi dan UPPS",
    deskripsi: "Tercetak di halaman muka LED dan baris identitas sheet Menu LKPS.",
    status: true,
    kolom: [
      { name: "perguruanTinggi", label: "Nama perguruan tinggi", contoh: "contoh: Universitas Lampung" },
      { name: "nama", label: "Unit Pengelola Program Studi (UPPS)", contoh: "contoh: Fakultas Teknik" },
    ],
  },
  {
    judul: "Alamat dan kontak UPPS",
    deskripsi: "Cadangan bila alamat atau telepon prodi belum diisi Tim Prodi.",
    kolom: [
      { name: "alamat", label: "Alamat", lebar: true },
      { name: "kota", label: "Kota/Kabupaten kedudukan", contoh: "contoh: Bandar Lampung" },
      { name: "kodePos", label: "Kode pos", contoh: "contoh: 35145" },
      { name: "telepon", label: "Nomor telepon" },
    ],
  },
  {
    judul: "SK pendirian perguruan tinggi",
    deskripsi: "Sama untuk semua prodi, jadi diisi sekali di sini (tidak lagi di Identitas prodi).",
    kolom: [
      { name: "skPendirian", label: "Nomor SK pendirian PT" },
      { name: "tanggalSkPendirian", label: "Tanggal SK pendirian PT", contoh: "contoh: 23 September 1965" },
      { name: "pejabatSkPendirian", label: "Pejabat penandatangan SK", contoh: "contoh: Presiden Republik Indonesia", lebar: true },
    ],
  },
];

/** Form Identitas institusi (D7, desain form 2): satu kali untuk semua prodi, dipakai LED dan LKPS. */
export function FormInstitusi({ awal }: { awal: MasukanFakultas }) {
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanFakultas>({ resolver: zodResolver(skemaFakultas), defaultValues: awal });
  const kirim = form.handleSubmit((nilai) => jalankan(() => aksiSimpanFakultas(nilai), { sukses: "Identitas institusi disimpan." }));
  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {GRUP.map((g) => (
          <Card key={g.judul}>
            <CardHeader>
              <CardTitle className="text-base">{g.judul}</CardTitle>
              <CardDescription>{g.deskripsi}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {g.kolom.map((k) => (
                <Controller
                  key={k.name}
                  name={k.name}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className={k.lebar ? "sm:col-span-2" : undefined}>
                      <FieldLabel htmlFor={`institusi-${k.name}`}>{k.label}</FieldLabel>
                      <Input {...field} value={field.value ?? ""} id={`institusi-${k.name}`} placeholder={k.contoh} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ))}
              {g.status && (
                <Controller
                  name="statusPt"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                      <FieldLabel htmlFor="institusi-statusPt">Status perguruan tinggi</FieldLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger id="institusi-statusPt" className="w-full"><SelectValue placeholder="Pilih status (sesuai sheet Menu LKPS)" /></SelectTrigger>
                        <SelectContent>
                          {STATUS_PT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Button type="submit" disabled={sibuk} className="w-fit">
        <IkonSibuk sibuk={sibuk} />
        Simpan identitas institusi
      </Button>
    </form>
  );
}
