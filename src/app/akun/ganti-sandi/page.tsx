import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { wajibLogin } from "@/lib/sesi";
import { berandaPeran } from "@/lib/peran";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormGantiSandi } from "./form-ganti-sandi";

export const metadata: Metadata = { title: "Ganti kata sandi" };

export default async function HalamanGantiSandi() {
  const p = await wajibLogin({ bolehBelumGantiSandi: true });
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <CardTitle>Ganti kata sandi</CardTitle>
          <CardDescription>
            {p.wajibGantiSandi
              ? "Kata sandi Anda dibuat atau diatur ulang oleh super admin. Ganti dengan kata sandi milik Anda sendiri sebelum melanjutkan."
              : `Masuk sebagai ${p.email}. Semua perangkat lain akan dikeluarkan setelah kata sandi diganti.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormGantiSandi />
          {!p.wajibGantiSandi && (
            <Link href={berandaPeran(p.peran)} className="mt-4 block text-center text-sm text-muted-foreground hover:underline">Kembali</Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
