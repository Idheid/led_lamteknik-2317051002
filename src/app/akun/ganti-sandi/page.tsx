import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, FileText, KeyRound } from "lucide-react";
import { wajibLogin } from "@/lib/sesi";
import { berandaPeran } from "@/lib/peran";
import { FormGantiSandi } from "./form-ganti-sandi";
import { TombolKeluar } from "./tombol-keluar";

export const metadata: Metadata = { title: "Ganti kata sandi" };

const TIPS = [
  "Minimal 8 karakter; 12 karakter atau lebih lebih aman.",
  "Campur huruf besar, huruf kecil, angka, dan simbol.",
  "Jangan memakai kata sandi yang sama dengan akun lain.",
  "Perangkat lain otomatis keluar setelah kata sandi diganti.",
];

/**
 * Ganti kata sandi (revisi 26 Okt 2026): bilah atas dengan tautan kembali (atau Keluar bila wajib ganti sandi),
 * kartu dua kolom: panel keterangan dan formulir dengan tampilkan sandi dan indikator kekuatan.
 */
export default async function HalamanGantiSandi() {
  const p = await wajibLogin({ bolehBelumGantiSandi: true });
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FileText className="size-4" aria-hidden /></span>
          Penyusun LED
        </span>
        {p.wajibGantiSandi && <TombolKeluar />}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">
        <div className="flex w-full max-w-4xl flex-col gap-4">
          {!p.wajibGantiSandi && (
            <Link href={berandaPeran(p.peran)} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="size-4" aria-hidden />Kembali
            </Link>
          )}
          <div className="grid overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-[1fr_1.25fr]">
            <aside className="flex flex-col gap-5 bg-primary/5 p-6 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><KeyRound className="size-5" aria-hidden /></span>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">Ganti kata sandi</h1>
                <p className="text-sm text-muted-foreground">
                  {p.wajibGantiSandi
                    ? "Kata sandi Anda dibuat atau diatur ulang oleh admin. Ganti dengan kata sandi milik Anda sendiri sebelum melanjutkan."
                    : "Perbarui kata sandi akun Anda."}
                </p>
              </div>
              <div className="rounded-xl bg-background/70 px-4 py-3 text-sm">
                <div className="text-xs text-muted-foreground">Akun</div>
                <div className="truncate font-medium">{p.nama}</div>
                <div className="truncate text-muted-foreground">{p.email}</div>
              </div>
              <ul className="flex flex-col gap-2.5 text-sm">
                {TIPS.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="size-3" aria-hidden /></span>
                    <span className="text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </aside>
            <div className="p-6 sm:p-8">
              <FormGantiSandi />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
