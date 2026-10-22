"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { formatTahunAkademik, labelPeriode, tsDariTahunPengajuan } from "@/lib/domain/tahun-akademik";
import { skemaProyek, type MasukanProyek } from "@/lib/validasi";
import { aksiBuatProyek } from "./aksi";

export interface PilihanProdiLed {
  id: string;
  nama: string;
  jenjang: string;
  /** null = bisa dibuat; selain itu alasan tidak bisa (LED aktif masih ada, instrumen jenjang belum aktif). */
  alasan: string | null;
}

/**
 * LED baru (revisi 19 Okt 2026): pilih prodi, tahun pengajuan, dan nama. Jenjang diambil dari data prodi dan
 * instrumen otomatis instrumen aktif jenjang itu. TS (tahun data LKPS) dihitung dari tahun pengajuan.
 */
export function FormProyekBaru({ prodi, tahunUsulan, awalProdiId }: { prodi: PilihanProdiLed[]; tahunUsulan: number; awalProdiId?: string }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  // revisi 22 Okt 2026: tombol Buat LED di daftar Program studi memilih prodinya langsung
  const pertama = prodi.find((x) => x.id === awalProdiId && !x.alasan) ?? prodi.find((x) => !x.alasan);
  const form = useForm<MasukanProyek>({
    resolver: zodResolver(skemaProyek),
    defaultValues: { prodiId: pertama?.id ?? "", nama: pertama ? `LED ${pertama.nama} ${tahunUsulan}` : "", tahunPengajuan: tahunUsulan },
  });
  const tahun = Number(useWatch({ control: form.control, name: "tahunPengajuan" }));
  const tahunSah = Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2100;
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiBuatProyek(nilai), { sukses: "LED dibuat.", lalu: (id) => router.push(`/proyek/${id}`) }),
  );
  if (prodi.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada program studi. Tambahkan dulu di menu Program studi.</p>;
  }
  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        <Controller
          name="prodiId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="led-prodi">Program studi</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  const x = prodi.find((y) => y.id === v);
                  if (x) form.setValue("nama", `LED ${x.nama} ${tahunSah ? tahun : tahunUsulan}`);
                }}
              >
                <SelectTrigger id="led-prodi" className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Pilih program studi" />
                </SelectTrigger>
                <SelectContent>
                  {prodi.map((x) => (
                    <SelectItem key={x.id} value={x.id} disabled={Boolean(x.alasan)}>
                      {x.nama} ({x.jenjang}){x.alasan ? ` · ${x.alasan}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Satu prodi hanya punya satu LED aktif; arsipkan LED periode sebelumnya dulu.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
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
        <Button type="submit" disabled={sibuk || !pertama} className="w-fit">
          <IkonSibuk sibuk={sibuk} />
          Buat LED
        </Button>
      </FieldGroup>
    </form>
  );
}
