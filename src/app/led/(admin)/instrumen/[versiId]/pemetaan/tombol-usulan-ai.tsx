"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { aksiMintaUsulanAi } from "../../aksi";

export interface PerkiraanUsulanAi {
  jumlahJudul: number;
  perkiraanToken: number;
  model: string;
}

/**
 * "Minta usulan AI" (perbaikan 2 Nov 2026, I4): tidak pernah berjalan otomatis. Sebelum dikirim, Admin melihat
 * perkiraan ukuran dan model yang dipakai, lalu mengonfirmasi.
 */
export function TombolUsulanAi({ versiId, perkiraan, nonaktif, keHalamanPemetaan }: {
  versiId: string; perkiraan: PerkiraanUsulanAi; nonaktif?: boolean; keHalamanPemetaan?: boolean;
}) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={<Button size="sm" variant="outline" disabled={nonaktif || sibuk}><Sparkles aria-hidden />Minta usulan AI</Button>}
      judul="Minta usulan struktur dari AI?"
      deskripsi={
        <span className="flex flex-col gap-2">
          <span>
            ±{formatAngka(perkiraan.jumlahJudul, 0)} judul dikirim, perkiraan {formatAngka(perkiraan.perkiraanToken, 0)} token. Model: {perkiraan.model}.
          </span>
          <span>
            Yang dikirim hanya kerangka judul (nama gaya, bernomor atau tidak, tingkat, dan 120 karakter pertama) serta daftar kriteria
            Matriks. Isi narasi tidak dikirim. Hasilnya hanya mengisi usulan di tabel Pemetaan; Anda tetap memeriksa dan menyimpannya sendiri.
          </span>
        </span>
      }
      labelAksi="Kirim ke AI"
      berbahaya={false}
      onKonfirmasi={() => jalankan(() => aksiMintaUsulanAi(versiId), {
        sukses: "Usulan AI sedang dibuat. Halaman Pemetaan diperbarui otomatis.",
        lalu: () => { if (keHalamanPemetaan) router.push(`/led/instrumen/${versiId}/pemetaan`); },
      })}
    />
  );
}
