"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COOKIE_PRODI_LKPS } from "@/modules/lkps/domain/prodi";

/**
 * Pemilih prodi modul LKPS untuk Admin UPPS dan reviewer LPMPP (Gabung LKPS G5). Sumber: dropdown prodi di
 * src/components/layout/header.tsx kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). Bedanya: daftar dari LED
 * (Admin: semua prodi, reviewer: prodi yang LED-nya ditugaskan), cookie `lkps_prodi`, dan tidak memilih prodi pertama
 * secara otomatis. Server tetap memeriksa pilihan ini (prodiAktifLkps).
 */
export function PemilihProdi({ daftar, aktif }: { daftar: { id: string; label: string }[]; aktif: string | null }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();

  function pilih(id: string) {
    document.cookie = `${COOKIE_PRODI_LKPS}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    mulai(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <Building2 className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">Program studi LKPS:</span>
      {daftar.length === 0 ? (
        <span className="text-muted-foreground">Belum ada program studi yang bisa Anda buka.</span>
      ) : (
        <Select value={aktif ?? undefined} onValueChange={pilih} disabled={menunggu}>
          <SelectTrigger size="sm" className="min-w-56 bg-background" aria-label="Pilih program studi LKPS">
            <SelectValue placeholder="Pilih program studi" />
          </SelectTrigger>
          <SelectContent>
            {daftar.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
