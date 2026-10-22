import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { ambilPengguna } from "@/lib/sesi";
import { berandaPeran } from "@/lib/peran";
import { FormLogin } from "./form-login";
import { FormAdminPertama } from "./form-admin-pertama";
import { perluAdminPertama } from "@/lib/data/pemasangan";

export const metadata: Metadata = { title: "Masuk" };

export default async function HalamanLogin({ searchParams }: PageProps<"/login">) {
  const p = await ambilPengguna();
  if (p) redirect(berandaPeran(p.peran));
  const { ke } = await searchParams;
  // revisi 23 Okt 2026: pemasangan pertama membuat admin dari sini, bukan dari .env
  const pertama = await perluAdminPertama();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <FileText className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Penyusun LED LAM Teknik</h1>
          <p className="text-sm text-muted-foreground">Draf Laporan Evaluasi Diri untuk akreditasi program studi</p>
        </div>
      </div>
      {pertama ? <FormAdminPertama /> : <FormLogin tujuan={typeof ke === "string" ? ke : undefined} />}
      {!pertama && (
        <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
          Akun dibuat oleh admin. Lupa kata sandi? Hubungi admin untuk mengatur ulang.
        </p>
      )}
    </div>
  );
}
