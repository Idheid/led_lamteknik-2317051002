import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { wajibLogin } from "@/modules/bersama/sesi";
import { berandaPeran } from "@/modules/bersama/peran";
import { ShellPeran } from "@/components/shell/shell-peran";
import { JudulHalaman } from "@/components/judul-halaman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { FormGantiSandi } from "./form-ganti-sandi";

export const metadata: Metadata = { title: "Ganti kata sandi" };

/**
 * Ganti kata sandi (revisi 26 Okt 2026): halaman biasa di dalam tata letak aplikasi (sidebar menurut peran), formulir
 * selebar halaman dan sedikit teks. Rencana 18 Nov S4: akun tanpa kata sandi dialihkan ke berandanya.
 */
export default async function HalamanGantiSandi() {
  const p = await wajibLogin({ bolehBelumGantiSandi: true });
  // S4: akun tanpa kata sandi (masuk lewat SSO saja) tidak punya sandi lama untuk diganti
  if (p.punyaSandi === false) redirect(berandaPeran(p.peran));
  return (
    <ShellPeran pengguna={p}>
      <JudulHalaman judul="Ganti kata sandi" deskripsi={p.email} />
      {p.wajibGantiSandi && (
        <Alert>
          <ShieldAlert aria-hidden />
          <AlertTitle>Ganti kata sandi sementara dulu</AlertTitle>
          <AlertDescription>Kata sandi ini dibuat admin. Setelah diganti, Anda bisa memakai semua menu.</AlertDescription>
        </Alert>
      )}
      <Card className="rounded-2xl">
        <CardContent className="px-6 py-2">
          <FormGantiSandi />
        </CardContent>
      </Card>
    </ShellPeran>
  );
}
