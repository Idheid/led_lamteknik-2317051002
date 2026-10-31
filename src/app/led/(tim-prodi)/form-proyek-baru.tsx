"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { formatTahunAkademik, pilihanTs, tsBawaan } from "@/modules/bersama/domain/tahun-akademik";
import { skemaProyek, type MasukanProyek } from "@/modules/led/validasi";
import { aksiBuatProyek } from "./aksi";

export interface ProdiLed {
  nama: string;
  jenjang: string;
  /** null = bisa dibuat; selain itu alasan tidak bisa (LED aktif masih ada, instrumen jenjang belum aktif). */
  alasan: string | null;
}

const namaOtomatis = (prodi: string, ts: number) => `LED ${prodi} TS ${formatTahunAkademik(ts)}`;

/**
 * LED baru. Revisi 31 Okt 2026 (Pak Tris: "kalau saya maju tahun 2027, saya pakai TS-nya kapan?"): prodi diambil dari
 * akun Tim Prodi; Tim Prodi mengisi tahun pengajuan dan memilih satu dari dua TS. TS bawaan dihitung dari batas
 * pengajuan (atau hari ini). Nama LED otomatis "LED {prodi} TS {tahun akademik}" selama belum diubah sendiri.
 */
export function FormProyekBaru({ prodi, tahunUsulan, tanggalAcuan }: { prodi: ProdiLed; tahunUsulan: number; tanggalAcuan: string }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const acuan = new Date(tanggalAcuan);
  const tsAwal = tsBawaan(tahunUsulan, acuan);
  const form = useForm<MasukanProyek>({
    resolver: zodResolver(skemaProyek),
    defaultValues: { nama: namaOtomatis(prodi.nama, tsAwal), tahunPengajuan: tahunUsulan, tsTahunMulai: tsAwal },
  });
  const tahun = Number(useWatch({ control: form.control, name: "tahunPengajuan" }));
  const ts = Number(useWatch({ control: form.control, name: "tsTahunMulai" }));
  const tahunSah = Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2100;
  const pilihan = tahunSah ? pilihanTs(tahun) : [];

  // tahun pengajuan berubah: pilih ulang TS bawaan untuk tahun itu
  useEffect(() => {
    if (!tahunSah) return;
    const sah = pilihanTs(tahun).some((x) => x.tsTahunMulai === Number(form.getValues("tsTahunMulai")));
    if (!sah) form.setValue("tsTahunMulai", tsBawaan(tahun, new Date(tanggalAcuan)));
  }, [tahun, tahunSah, form, tanggalAcuan]);
  // nama otomatis mengikuti TS selama Tim Prodi belum mengubahnya sendiri
  useEffect(() => {
    if (!Number.isInteger(ts) || form.getFieldState("nama").isDirty) return;
    form.setValue("nama", namaOtomatis(prodi.nama, ts));
  }, [ts, form, prodi.nama]);

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
              <FieldLabel htmlFor="led-tahun">Tahun pengajuan</FieldLabel>
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
              <FieldDescription>Tahun usulan akreditasi diajukan ke LAM Teknik.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="tsTahunMulai"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id="led-ts">TS (tahun data LKPS)</FieldLabel>
              <div role="radiogroup" aria-labelledby="led-ts" className="flex flex-col gap-2">
                {pilihan.map((x) => (
                  <label
                    key={x.tsTahunMulai}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${Number(field.value) === x.tsTahunMulai ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <input
                      type="radio"
                      name="tsTahunMulai"
                      value={x.tsTahunMulai}
                      checked={Number(field.value) === x.tsTahunMulai}
                      onChange={() => field.onChange(x.tsTahunMulai)}
                      className="mt-1 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="block font-medium">{x.label}</span>
                      <span className="block text-muted-foreground">{x.keterangan}</span>
                    </span>
                  </label>
                ))}
              </div>
              {!tahunSah && <FieldDescription>Isi tahun pengajuan dulu.</FieldDescription>}
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
              <FieldDescription>Terisi otomatis; boleh diubah.</FieldDescription>
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
