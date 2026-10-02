import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { AKTIF } from "@/lib/data/organisasi";
import { wajibSuperAdmin } from "@/lib/sesi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ringkasan" };

export default async function RingkasanAdmin() {
  await wajibSuperAdmin();
  const [versi, versiAktif, upps, prodi, akunPj, proyek, tanpaAkun] = await Promise.all([
    prisma.versiInstrumen.count(),
    prisma.versiInstrumen.count({ where: { aktif: true } }),
    prisma.upps.count(),
    prisma.prodi.count(),
    prisma.user.count({ where: { role: "PENANGGUNG_JAWAB" } }),
    prisma.proyekLED.count(),
    prisma.prodi.count({ where: { akun: { none: AKTIF } } }),
  ]);
  const kartu = [
    { judul: "Versi instrumen", nilai: versi, ket: `${versiAktif} aktif`, href: "/admin/instrumen" },
    { judul: "UPPS", nilai: upps, ket: `${prodi} program studi`, href: "/admin/prodi" },
    { judul: "Akun penanggung jawab", nilai: akunPj, ket: tanpaAkun ? `${tanpaAkun} prodi belum punya akun` : "Semua prodi punya akun", href: "/admin/akun" },
    { judul: "Proyek LED", nilai: proyek, ket: "dibuat penanggung jawab", href: "/admin/prodi" },
  ];
  return (
    <>
      <JudulHalaman
        judul="Ringkasan"
        deskripsi="Siapkan versi instrumen, UPPS, program studi, dan akun penanggung jawab. Penanggung jawab kemudian membuat proyek LED prodinya."
      />
      <Petunjuk
        kunci="admin-ringkasan"
        fungsi="Halaman awal super admin: ringkasan instrumen, UPPS, program studi, dan akun."
        langkah={[
          "Periksa versi instrumen di menu Instrumen (versi aktif dipakai proyek baru).",
          "Tambahkan UPPS dan program studi di menu Prodi dan UPPS.",
          "Buat akun penanggung jawab untuk setiap prodi di menu Akun, lalu berikan kata sandi sementara.",
          "Atur model Gemini di menu Model LLM dan, bila perlu, tambahkan kunci cadangan.",
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((k) => (
          <Link key={k.judul} href={k.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader>
                <CardDescription>{k.judul}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{k.nilai}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{k.ket}</span>
                <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Urutan penyiapan</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Periksa versi instrumen (sudah diimpor dari data awal). Untuk perubahan peraturan, salin versi lalu sunting salinannya.</li>
            <li>Tambahkan UPPS dan program studi beserta identitasnya.</li>
            <li>Buat satu akun penanggung jawab untuk setiap program studi.</li>
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
