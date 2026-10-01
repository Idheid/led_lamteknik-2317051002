"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { PetaTS } from "@/components/peta-ts";
import { formatTahunAkademik } from "@/lib/domain/tahun-akademik";
import { skemaProyek, type MasukanProyek } from "@/lib/validasi";
import { aksiBuatProyek } from "./aksi";

export function FormProyekBaru({
  versi, tsUsulan, namaAwal,
}: { versi: { id: string; label: string }[]; tsUsulan: number; namaAwal: string }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanProyek>({
    resolver: zodResolver(skemaProyek),
    defaultValues: { nama: namaAwal, versiId: versi[0]?.id ?? "", tsTahunMulai: tsUsulan },
  });
  const ts = Number(useWatch({ control: form.control, name: "tsTahunMulai" }));
  const tsSah = Number.isInteger(ts) && ts >= 2000 && ts <= 2100;
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiBuatProyek(nilai), { sukses: "Proyek LED dibuat.", lalu: (id) => router.push(`/proyek/${id}`) }),
  );
  if (versi.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada versi instrumen aktif. Hubungi super admin.</p>;
  }
  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        <Controller
          name="nama"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="proyek-nama">Nama proyek</FieldLabel>
              <Input {...field} id="proyek-nama" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="versiId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="proyek-versi">Versi instrumen</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="proyek-versi" className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Pilih versi" />
                </SelectTrigger>
                <SelectContent>
                  {versi.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="tsTahunMulai"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="proyek-ts">Tahun TS (tahun mulai)</FieldLabel>
              <div className="flex items-center gap-3">
                <Input
                  id="proyek-ts"
                  type="number"
                  className="w-28"
                  value={String(field.value ?? "")}
                  onChange={(e) => field.onChange(e.target.value)}
                  aria-invalid={fieldState.invalid}
                />
                <span className="text-sm text-muted-foreground">TS = {tsSah ? formatTahunAkademik(ts) : "—"}</span>
              </div>
              <FieldDescription>
                TS adalah tahun akademik penuh terakhir saat pengajuan. Usulan hari ini: {formatTahunAkademik(tsUsulan)}.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {tsSah && <PetaTS tsTahunMulai={ts} className="sm:grid-cols-2" />}
        <Button type="submit" disabled={sibuk} className="w-fit">
          <IkonSibuk sibuk={sibuk} />
          Buat proyek
        </Button>
      </FieldGroup>
    </form>
  );
}
