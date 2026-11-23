"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { authClient } from "@/modules/bersama/auth-client";
import { berandaPeran } from "@/modules/bersama/peran";
import { skemaLogin } from "@/modules/bersama/validasi";
import { KODE_LOGIN_TERKUNCI } from "@/modules/bersama/domain/login-gagal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputSandi } from "@/components/input-sandi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { z } from "zod";

/** Tujuan setelah login hanya boleh jalur di dalam aplikasi (cegah open redirect). */
function tujuanAman(ke: string | undefined): string | null {
  return ke && ke.startsWith("/") && !ke.startsWith("//") && !ke.startsWith("/login") ? ke : null;
}

/** Menit dari pesan "Coba lagi dalam N menit." (hook login gagal); cadangan 5. */
function menitDari(pesan: string | undefined): number {
  const m = /dalam (\d+) menit/.exec(pesan ?? "");
  return m ? Number(m[1]) : 5;
}

/**
 * Form masuk (Rencana 18 Nov S3, Figma L1–L3): email + kata sandi (Better Auth), lalu tombol SSO Unila bila aktif.
 * Terkunci (3 kali gagal dalam 5 menit) → peringatan kuning dan tombol Masuk nonaktif sampai waktunya habis.
 */
export function FormLogin({ tujuan, sso, galatSso }: { tujuan?: string; sso: boolean; galatSso: string | null }) {
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(galatSso);
  const [terkunciMenit, setTerkunciMenit] = useState<number | null>(null);
  const form = useForm<z.input<typeof skemaLogin>>({
    resolver: zodResolver(skemaLogin),
    defaultValues: { email: "", kataSandi: "" },
  });

  // buka lagi tombol Masuk sesudah masa kunci habis (server tetap yang memutuskan)
  useEffect(() => {
    if (terkunciMenit === null) return;
    const t = setTimeout(() => setTerkunciMenit(null), terkunciMenit * 60_000);
    return () => clearTimeout(t);
  }, [terkunciMenit]);

  async function kirim(nilai: z.input<typeof skemaLogin>) {
    setGalat(null);
    const { data, error } = await authClient.signIn.email({ email: nilai.email.trim().toLowerCase(), password: nilai.kataSandi });
    if (error || !data) {
      // terkunci karena 3 kali gagal (hook S3) → peringatan + tombol nonaktif
      if (error?.status === 429 && error.code === KODE_LOGIN_TERKUNCI) {
        setTerkunciMenit(menitDari(error.message));
        return;
      }
      // 429 lain = batas laju bawaan Better Auth (3 permintaan/10 detik untuk masuk dengan email): cukup tunggu sebentar
      setGalat(error?.status === 429
        ? "Terlalu banyak permintaan dalam waktu singkat. Tunggu beberapa detik lalu coba lagi."
        : error?.status === 403 ? "Akun Anda dinonaktifkan. Hubungi admin." : "Email atau kata sandi salah.");
      return;
    }
    const peran = (data.user as { role?: string }).role;
    router.replace(tujuanAman(tujuan) ?? berandaPeran(peran));
    router.refresh();
  }

  const tujuanSso = tujuanAman(tujuan);
  const alamatSso = `/api/sso/mulai${tujuanSso ? `?ke=${encodeURIComponent(tujuanSso)}` : ""}`;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Masuk</h2>
        <p className="text-sm text-muted-foreground">Gunakan email dan kata sandi akun Anda.</p>
      </div>
      <form onSubmit={form.handleSubmit(kirim)} noValidate>
        <FieldGroup>
          {terkunciMenit !== null && (
            <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert aria-hidden />
              <AlertTitle>Terlalu banyak percobaan</AlertTitle>
              <AlertDescription className="text-amber-900/90 dark:text-amber-200/90">
                Coba lagi dalam {terkunciMenit} menit, atau hubungi Admin UPPS bila lupa kata sandi.
              </AlertDescription>
            </Alert>
          )}
          {galat && terkunciMenit === null && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{galat}</AlertDescription>
            </Alert>
          )}
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input {...field} id="email" type="email" autoComplete="username" placeholder="nama@unila.ac.id" aria-invalid={fieldState.invalid} autoFocus />
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
                <InputSandi {...field} id="kataSandi" autoComplete="current-password" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button type="submit" disabled={form.formState.isSubmitting || terkunciMenit !== null} className="w-full">
            {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Masuk
          </Button>
          {sso && (
            <>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">atau</FieldSeparator>
              <Field>
                <Button asChild variant="outline" className="w-full">
                  <a href={alamatSso}><KeyRound aria-hidden />Masuk dengan SSO Unila</a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Untuk dosen dan tenaga kependidikan Unila. Akun yang belum terdaftar masuk sebagai Tamu (hanya melihat dashboard).
                </p>
              </Field>
            </>
          )}
        </FieldGroup>
      </form>
    </div>
  );
}
