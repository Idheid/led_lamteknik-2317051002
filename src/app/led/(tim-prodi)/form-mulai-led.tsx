"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { isianSetelahGantiTahun, namaLedOtomatis, pilihanTs, tsBawaan } from "@/modules/bersama/domain/tahun-akademik";
import { skemaProyek, type MasukanProyek } from "@/modules/led/validasi";
import { TombolKonfirmasi } from "@/components/aksi-klien";
import { aksiBuatProyek, aksiMulaiPeriodeBerikutnya } from "./aksi";

export interface ProdiLed {
  nama: string;
  /** null = bisa dibuat; selain itu alasan tidak bisa (instrumen jenjang belum aktif). */
  alasan: string | null;
}

const tahunSah = (t: number) => Number.isInteger(t) && t >= 2000 && t <= 2100;

/**
 * Isian kartu "Mulai LED {prodi}" di /led (perbaikan 1 Nov 2026, P5; menggantikan halaman /led/baru). Prodi diambil dari
 * akun Tim Prodi; Tim Prodi hanya mengisi tahun pengajuan dan memilih satu dari dua TS (revisi 31 Okt 2026). Setiap kali
 * tahun diganti, TS bawaan tahun itu dipilih ulang. Nama LED dibuat otomatis "LED {prodi} {tahun} (TS {tahun akademik})"
 * dan bisa diubah di Pengaturan LED.
 */
export function FormMulaiLed({ prodi, tahunUsulan, tanggalAcuan, berikutnya, children }: {
  prodi: ProdiLed;
  tahunUsulan: number;
  tanggalAcuan: string;
  /** L4: Mulai LED periode berikutnya; teks konfirmasi (LED lama diarsipkan, instrumen baru) */
  berikutnya?: { konfirmasi: string };
  /** L5: pilihan bahan yang disalin */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanProyek>({
    resolver: zodResolver(skemaProyek),
    defaultValues: { tahunPengajuan: tahunUsulan, tsTahunMulai: tsBawaan(tahunUsulan, new Date(tanggalAcuan)) },
  });
  const tahun = Number(useWatch({ control: form.control, name: "tahunPengajuan" }));
  const ts = Number(useWatch({ control: form.control, name: "tsTahunMulai" }));
  const pilihan = tahunSah(tahun) ? pilihanTs(tahun) : [];
  const nama = tahunSah(tahun) && Number.isInteger(ts) ? namaLedOtomatis(prodi.nama, tahun, ts) : null;

  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => (berikutnya ? aksiMulaiPeriodeBerikutnya(nilai) : aksiBuatProyek(nilai)), {
      sukses: berikutnya ? "LED periode berikutnya dibuat. LED lama diarsipkan." : "LED dibuat.",
      lalu: (id) => router.push(`/led/${id}`),
    }),
  );
  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        <Controller
          name="tahunPengajuan"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="led-tahun">Tahun pengajuan</FieldLabel>
              <Input
                {...field}
                value={String(field.value ?? "")}
                onChange={(e) => {
                  field.onChange(e);
                  const t = Number(e.target.value);
                  // tahun diganti: TS bawaan tahun itu selalu dipilih ulang
                  if (tahunSah(t)) form.setValue("tsTahunMulai", isianSetelahGantiTahun(prodi.nama, t, new Date(tanggalAcuan)).tsTahunMulai);
                }}
                id="led-tahun"
                type="number"
                min={2000}
                max={2100}
                className="w-32 max-w-32"
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
              <div role="radiogroup" aria-labelledby="led-ts" className="grid gap-2 sm:grid-cols-2">
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
              {!tahunSah(tahun) && <FieldDescription>Isi tahun pengajuan dulu.</FieldDescription>}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {nama && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Nama LED: <span className="font-medium text-foreground">{nama}</span>. Bisa diubah nanti di Pengaturan LED.
          </p>
        )}
        {children}
        {berikutnya ? (
          <TombolKonfirmasi
            pemicu={<Button type="button" size="lg" disabled={sibuk || Boolean(prodi.alasan)} className="w-fit"><IkonSibuk sibuk={sibuk} />Mulai LED periode berikutnya</Button>}
            judul="Mulai LED periode berikutnya?"
            deskripsi={berikutnya.konfirmasi}
            labelAksi="Mulai LED baru"
            berbahaya={false}
            onKonfirmasi={() => void kirim()}
          />
        ) : (
          <Button type="submit" size="lg" disabled={sibuk || Boolean(prodi.alasan)} className="w-fit">
            <IkonSibuk sibuk={sibuk} />
            Mulai LED
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}
