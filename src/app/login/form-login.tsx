"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { berandaPeran } from "@/lib/peran";
import { skemaLogin } from "@/lib/validasi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { z } from "zod";

/** Tujuan setelah login hanya boleh jalur di dalam aplikasi (cegah open redirect). */
function tujuanAman(ke: string | undefined): string | null {
  return ke && ke.startsWith("/") && !ke.startsWith("//") && !ke.startsWith("/login") ? ke : null;
}

export function FormLogin({ tujuan }: { tujuan?: string }) {
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(null);
  const form = useForm<z.input<typeof skemaLogin>>({
    resolver: zodResolver(skemaLogin),
    defaultValues: { email: "", kataSandi: "" },
  });

  async function kirim(nilai: z.input<typeof skemaLogin>) {
    setGalat(null);
    const { data, error } = await authClient.signIn.email({ email: nilai.email.trim().toLowerCase(), password: nilai.kataSandi });
    if (error || !data) {
      const pesan = error?.status === 403
        ? "Akun Anda dinonaktifkan. Hubungi admin."
        : error?.status === 429
          ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
          : "Email atau kata sandi salah.";
      setGalat(pesan);
      return;
    }
    const peran = (data.user as { role?: string }).role;
    router.replace(tujuanAman(tujuan) ?? berandaPeran(peran));
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>Gunakan email dan kata sandi akun Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(kirim)} noValidate>
          <FieldGroup>
            {galat && (
              <Alert variant="destructive">
                <AlertDescription>{galat}</AlertDescription>
              </Alert>
            )}
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input {...field} id="email" type="email" autoComplete="username" aria-invalid={fieldState.invalid} autoFocus />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="kataSandi"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="kataSandi">Kata sandi</FieldLabel>
                  <Input {...field} id="kataSandi" type="password" autoComplete="current-password" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              Masuk
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
