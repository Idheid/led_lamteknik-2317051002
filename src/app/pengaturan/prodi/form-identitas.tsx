"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaIdentitasProdi, type IdentitasProdi } from "@/modules/bersama/validasi";
import { KOLOM_IDENTITAS } from "./form-prodi";
import { aksiSimpanIdentitasProdi } from "./aksi";

// L1 (2 Nov 2026): data akreditasi diturunkan dari riwayat akreditasi, tidak diketik di sini
const DARI_RIWAYAT = new Set<string>(["peringkatAkreditasi", "nomorSkAkreditasi", "lembagaAkreditasi"]);

/** Identitas pengusul diisi Tim Prodi untuk prodinya sendiri (revisi 31 Okt 2026, B4); nama dan jenjang milik Admin UPPS. */
export function FormIdentitasProdi({ prodiId, awal }: { prodiId: string; awal: Partial<IdentitasProdi> }) {
  const { sibuk, jalankan } = useAksi();
  const form = useForm<Partial<IdentitasProdi>>({ resolver: zodResolver(skemaIdentitasProdi.partial()), defaultValues: awal });
  const kirim = form.handleSubmit((nilai) => jalankan(() => aksiSimpanIdentitasProdi(prodiId, nilai), { sukses: "Identitas prodi disimpan." }));
  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {KOLOM_IDENTITAS.map((k) => (
          <Controller
            key={k.name}
            name={k.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={k.lebar ? "sm:col-span-2" : undefined}>
                <FieldLabel htmlFor={k.name}>{k.label}</FieldLabel>
                <Input {...field} value={field.value ?? ""} id={k.name} placeholder={k.contoh} aria-invalid={fieldState.invalid} disabled={DARI_RIWAYAT.has(k.name)} />
                {DARI_RIWAYAT.has(k.name) && <p className="text-xs text-muted-foreground">Diambil dari Riwayat akreditasi (dicatat lewat Catat hasil akreditasi).</p>}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        ))}
      </div>
      <Button type="submit" disabled={sibuk} className="w-fit">
        <IkonSibuk sibuk={sibuk} />
        Simpan identitas
      </Button>
    </form>
  );
}
