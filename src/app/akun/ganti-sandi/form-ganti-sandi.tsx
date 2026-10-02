"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk } from "@/components/aksi-klien";
import { skemaGantiSandi, type MasukanGantiSandi } from "@/lib/validasi";
import { aksiGantiSandi } from "../aksi";

const KOLOM = [
  { name: "sandiLama", label: "Kata sandi lama", auto: "current-password" },
  { name: "sandiBaru", label: "Kata sandi baru", auto: "new-password" },
  { name: "ulangi", label: "Ulangi kata sandi baru", auto: "new-password" },
] as const;

export function FormGantiSandi() {
  const router = useRouter();
  const form = useForm<MasukanGantiSandi>({
    resolver: zodResolver(skemaGantiSandi),
    defaultValues: { sandiLama: "", sandiBaru: "", ulangi: "" },
  });
  const kirim = form.handleSubmit(async (nilai) => {
    const r = await aksiGantiSandi(nilai);
    if (!r.ok) {
      toast.error(r.pesan);
      return;
    }
    toast.success("Kata sandi diganti.");
    router.replace(r.data);
    router.refresh();
  });
  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        {KOLOM.map((k) => (
          <Controller
            key={k.name}
            name={k.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={k.name}>{k.label}</FieldLabel>
                <Input {...field} id={k.name} type="password" autoComplete={k.auto} aria-invalid={fieldState.invalid} />
                {k.name === "sandiBaru" && <FieldDescription>Minimal 8 karakter, berbeda dari kata sandi lama.</FieldDescription>}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        ))}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          <IkonSibuk sibuk={form.formState.isSubmitting} />
          Simpan kata sandi baru
        </Button>
      </FieldGroup>
    </form>
  );
}
