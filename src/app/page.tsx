import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { wajibLogin } from "@/modules/bersama/sesi";
import { berandaPeran } from "@/components/shell/menu-peran";
import { MenuPengguna } from "@/components/shell/menu-pengguna";
import { LABEL_PERAN } from "@/modules/bersama/peran";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Akreditasi LAM Teknik" };

/**
 * Halaman awal setelah login. Desain form 2 (2 Nov 2026): LED dan LKPS LAM Teknik satu aplikasi, jadi tidak ada lagi
 * halaman "Pilih modul". Pengguna langsung masuk ke berandanya: Admin UPPS ke Dashboard akreditasi, Tim Prodi ke LED
 * prodinya (Data LKPS dan Identitas prodi di menu yang sama), reviewer LPMPP ke LED yang ditugaskan.
 */
export default async function HalamanAwal() {
  const p = await wajibLogin();
  if (p.peran !== "TIM_PRODI" || p.prodiId) redirect(berandaPeran(p.peran));
  // akun Tim Prodi tanpa prodi (data lama): jangan dialihkan ke /led yang mengembalikan ke sini
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 p-6">
      <div className="flex justify-end"><MenuPengguna nama={p.nama} email={p.email} peran={LABEL_PERAN[p.peran]} /></div>
      <Alert>
        <AlertTitle>Akun belum terhubung ke program studi</AlertTitle>
        <AlertDescription>Minta Admin UPPS memilih program studi untuk akun Anda di Kelola akun (Ubah peran).</AlertDescription>
      </Alert>
    </main>
  );
}
