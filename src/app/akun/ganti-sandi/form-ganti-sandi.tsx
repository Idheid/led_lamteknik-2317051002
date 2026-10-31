"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk } from "@/components/aksi-klien";
import { cn } from "@/modules/bersama/utils";
import { skemaGantiSandi, type MasukanGantiSandi } from "@/modules/bersama/validasi";
import { aksiGantiSandi } from "../aksi";

const KOLOM = [
  { name: "sandiLama", label: "Kata sandi lama", auto: "current-password" },
  { name: "sandiBaru", label: "Kata sandi baru", auto: "new-password" },
  { name: "ulangi", label: "Ulangi kata sandi baru", auto: "new-password" },
] as const;

/** Kekuatan kata sandi sederhana 0-4: panjang ≥ 8, ≥ 12, campuran huruf besar/kecil, angka, simbol. */
function kekuatan(s: string): number {
  if (!s) return 0;
  let n = s.length >= 8 ? 1 : 0;
  if (s.length >= 12) n++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) n++;
  if (/\d/.test(s) && /[^A-Za-z0-9]/.test(s)) n++;
  return n;
}

const LABEL_KUAT = ["Terlalu pendek", "Lemah", "Cukup", "Kuat", "Sangat kuat"];
const WARNA_KUAT = ["bg-rose-500", "bg-rose-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-500"];

export function FormGantiSandi() {
  const router = useRouter();
  const [lihat, setLihat] = useState(false);
  const form = useForm<MasukanGantiSandi>({
    resolver: zodResolver(skemaGantiSandi),
    defaultValues: { sandiLama: "", sandiBaru: "", ulangi: "" },
  });
  const baru = useWatch({ control: form.control, name: "sandiBaru" });
  const n = kekuatan(baru);
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
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <FieldGroup className="grid gap-5 lg:grid-cols-3">
        {KOLOM.map((k) => (
          <Controller
            key={k.name}
            name={k.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={k.name}>{k.label}</FieldLabel>
                <div className="relative">
                  <Input {...field} id={k.name} type={lihat ? "text" : "password"} autoComplete={k.auto} aria-invalid={fieldState.invalid} className="h-11 pr-11" />
                  {k.name === "sandiLama" && (
                    <button
                      type="button"
                      onClick={() => setLihat((x) => !x)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {lihat ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                  )}
                </div>
                {k.name === "sandiBaru" && baru && (
                  <div className="flex items-center gap-3" aria-live="polite">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= n ? WARNA_KUAT[n] : "bg-muted")} />)}
                    </div>
                    <span className="w-24 text-right text-xs text-muted-foreground">{LABEL_KUAT[n]}</span>
                  </div>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        ))}
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          <IkonSibuk sibuk={form.formState.isSubmitting} />
          Simpan kata sandi baru
        </Button>
        <span className="text-sm text-muted-foreground">Minimal 8 karakter. Perangkat lain akan keluar otomatis.</span>
      </div>
    </form>
  );
}
