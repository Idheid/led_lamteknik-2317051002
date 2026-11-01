"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/modules/bersama/auth-client";
import { skemaAkun, type MasukanAkun } from "@/modules/bersama/validasi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputSandi } from "@/components/input-sandi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { aksiBuatAdminPertama } from "./aksi";

/** Pemasangan pertama (revisi 23 Okt 2026): buat akun admin tanpa mengisi .env, lalu langsung masuk. */
export function FormAdminPertama() {
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(null);
  const form = useForm<MasukanAkun>({
    resolver: zodResolver(skemaAkun),
    defaultValues: { nama: "", email: "", kataSandi: "" },
  });

  async function kirim(nilai: MasukanAkun) {
    setGalat(null);
    const r = await aksiBuatAdminPertama(nilai);
    if (!r.ok) {
      setGalat(r.pesan);
      return;
    }
    await authClient.signIn.email({ email: nilai.email.trim().toLowerCase(), password: nilai.kataSandi });
    toast.success("Akun Admin UPPS dibuat. Selanjutnya buat akun Tim Prodi dan asesor di Kelola akun.");
    router.replace("/admin/akun");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Buat akun admin pertama</CardTitle>
        <CardDescription>Website baru dipasang dan belum punya admin. Akun ini (Admin UPPS) dipakai untuk membuat akun Tim Prodi dan asesor.</CardDescription>
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
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-nama">Nama</FieldLabel>
                  <Input {...field} id="admin-nama" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-email">Email</FieldLabel>
                  <Input {...field} id="admin-email" type="email" autoComplete="email" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="kataSandi"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-sandi">Kata sandi</FieldLabel>
                  <InputSandi {...field} id="admin-sandi" autoComplete="new-password" aria-invalid={fieldState.invalid} />
                  <FieldDescription>Minimal 8 karakter. Simpan baik-baik.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              Buat akun admin
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
