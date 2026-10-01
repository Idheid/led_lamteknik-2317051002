"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { JENJANG } from "@/lib/domain/instrumen";
import { skemaProdi, type MasukanProdi } from "@/lib/validasi";
import { aksiSimpanProdi } from "../aksi";

type KunciIdentitas = keyof MasukanProdi["identitas"];

const KOLOM_IDENTITAS: { name: KunciIdentitas; label: string; contoh?: string; lebar?: boolean }[] = [
  { name: "skPendirian", label: "Nomor SK pendirian PT" },
  { name: "tanggalSkPendirian", label: "Tanggal SK pendirian PT", contoh: "contoh: 23 September 1965" },
  { name: "skPembukaan", label: "Nomor SK pembukaan prodi" },
  { name: "tanggalSkPembukaan", label: "Tanggal SK pembukaan prodi" },
  { name: "peringkatAkreditasi", label: "Peringkat akreditasi terakhir", contoh: "contoh: Baik Sekali" },
  { name: "nomorSkAkreditasi", label: "Nomor SK akreditasi" },
  { name: "lembagaAkreditasi", label: "Lembaga akreditasi", contoh: "contoh: BAN-PT atau LAM Teknik" },
  { name: "akreditasiBerlakuSampai", label: "Akreditasi berlaku sampai" },
  { name: "telepon", label: "Telepon" },
  { name: "email", label: "Email prodi" },
  { name: "laman", label: "Laman prodi", lebar: true },
];

export function FormProdi({
  id, awal, upps,
}: { id?: string; awal: MasukanProdi; upps: { id: string; nama: string }[] }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanProdi>({ resolver: zodResolver(skemaProdi), defaultValues: awal });
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiSimpanProdi(nilai, id), {
      sukses: id ? "Program studi diperbarui." : "Program studi ditambahkan.",
      lalu: () => router.push("/admin/prodi"),
    }),
  );
  return (
    <form onSubmit={kirim} noValidate className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data utama</CardTitle>
          <CardDescription>Jenjang menentukan sub-bagian dan butir penilaian yang tampil di form LED.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              name="uppsId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="uppsId">UPPS</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="uppsId" aria-invalid={fieldState.invalid} className="w-full">
                      <SelectValue placeholder="Pilih UPPS" />
                    </SelectTrigger>
                    <SelectContent>
                      {upps.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="nama">Nama program studi</FieldLabel>
                  <Input {...field} id="nama" placeholder="contoh: Teknik Informatika" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="jenjang"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="jenjang">Jenjang</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="jenjang" aria-invalid={fieldState.invalid} className="w-full">
                        <SelectValue placeholder="Pilih jenjang" />
                      </SelectTrigger>
                      <SelectContent>
                        {JENJANG.map((j) => (
                          <SelectItem key={j.kode} value={j.kode}>{j.nama} ({j.kode})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="kodePddikti"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="kodePddikti">Kode PDDikti</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id="kodePddikti" inputMode="numeric" aria-invalid={fieldState.invalid} />
                    <FieldDescription>Kunci bersama dengan sistem LKPS.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="identitas.alamat"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="alamat">Alamat prodi</FieldLabel>
                  <Textarea {...field} value={field.value ?? ""} id="alamat" rows={2} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identitas pengusul</CardTitle>
          <CardDescription>Dipakai untuk halaman identitas di LED. Semua kolom boleh dikosongkan dulu.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {KOLOM_IDENTITAS.map((k) => (
              <Controller
                key={k.name}
                name={`identitas.${k.name}`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className={k.lebar ? "sm:col-span-2" : undefined}>
                    <FieldLabel htmlFor={k.name}>{k.label}</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={k.name} placeholder={k.contoh} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2 xl:col-span-2">
        <Button type="submit" disabled={sibuk}>
          <IkonSibuk sibuk={sibuk} />
          Simpan
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/prodi")}>Batal</Button>
      </div>
    </form>
  );
}
