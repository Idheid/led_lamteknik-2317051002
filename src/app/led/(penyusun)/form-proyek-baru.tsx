"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { formatTahunAkademik, labelPeriode, tsDariTahunPengajuan } from "@/modules/bersama/domain/tahun-akademik";
import { skemaProyek, type MasukanProyek } from "@/modules/led/validasi";
import { aksiBuatProyek } from "./aksi";

export interface ProdiLed {
  nama: string;
  jenjang: string;
  /** null = bisa dibuat; selain itu alasan tidak bisa (LED aktif masih ada, instrumen jenjang belum aktif). */
  alasan: string | null;
}

/**
 * LED baru. Revisi 31 Okt 2026: Tim Prodi membuat LED untuk prodinya sendiri; prodi diambil dari akun dan hanya
 * ditampilkan. Jenjang diambil dari data prodi dan instrumen otomatis instrumen aktif jenjang itu. TS (tahun data
 * LKPS) dihitung dari tahun pengajuan.
 */
export function FormProyekBaru({ prodi, tahunUsulan }: { prodi: ProdiLed; tahunUsulan: number }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanProyek>({
    resolver: zodResolver(skemaProyek),
    defaultValues: { nama: `LED ${prodi.nama} ${tahunUsulan}`, tahunPengajuan: tahunUsulan },
  });
  const tahun = Number(useWatch({ control: form.control, name: "tahunPengajuan" }));
  const tahunSah = Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2100;
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiBuatProyek(nilai), { sukses: "LED dibuat.", lalu: (id) => router.push(`/led/${id}`) }),
  );
  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel>Program studi</FieldLabel>
          <p className="text-sm font-medium">{namaJenjang(prodi.jenjang)} {prodi.nama}</p>
          <FieldDescription>
            {prodi.alasan ?? "Program studi mengikuti akun Anda. Satu prodi hanya punya satu LED aktif; arsipkan LED periode sebelumnya dulu."}
          </FieldDescription>
        </Field>
        <Controller
          name="tahunPengajuan"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="led-tahun">Tahun pengajuan akreditasi</FieldLabel>
              <Input
                {...field}
                value={String(field.value ?? "")}
                id="led-tahun"
                type="number"
                min={2000}
                max={2100}
                className="w-32"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                {tahunSah
                  ? `${labelPeriode(tahun)}. Tahun data LKPS (TS) ${formatTahunAkademik(tsDariTahunPengajuan(tahun))}; bisa diubah di Pengaturan LED.`
                  : "Tahun pengajuan menentukan label periode 5 tahun dan TS."}
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="nama"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="led-nama">Nama LED</FieldLabel>
              <Input {...field} id="led-nama" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" size="lg" disabled={sibuk || Boolean(prodi.alasan)} className="w-fit">
          <IkonSibuk sibuk={sibuk} />
          Buat LED
        </Button>
      </FieldGroup>
    </form>
  );
}
