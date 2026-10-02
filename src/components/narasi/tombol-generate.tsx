"use client";

import { toast } from "sonner";
import { CheckCheck, RefreshCw, Sparkles } from "lucide-react";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { Button } from "@/components/ui/button";
import { aksiMulaiGenerate, aksiTandaiBagianSelesai } from "@/app/proyek/aksi";

/** Tombol "Generate kriteria" (semua sub-bagian) atau "Generate ulang butir" (satu sub-bagian). */
export function TombolGenerate({
  proyekId, bagianKode, subBagianKode, label, sudahAda, nonaktif, ukuran = "default",
}: {
  proyekId: string;
  bagianKode: string;
  subBagianKode?: string;
  label: string;
  sudahAda: boolean;
  nonaktif?: boolean;
  ukuran?: "default" | "sm";
}) {
  const { sibuk, jalankan } = useAksi();
  const mulai = () => jalankan(() => aksiMulaiGenerate(proyekId, bagianKode, subBagianKode), {
    lalu: (t) => t.status === "tertunda"
      ? toast.warning(t.pesan ?? "Penyusunan menunggu kunci API.")
      : toast.success("Masuk antrean penyusunan. Anda boleh meninggalkan halaman ini; hasilnya muncul otomatis."),
  });
  const ikon = sibuk ? <IkonSibuk sibuk /> : sudahAda ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />;
  if (!sudahAda) {
    return <Button size={ukuran} disabled={sibuk || nonaktif} onClick={mulai}>{ikon}{label}</Button>;
  }
  return (
    <TombolKonfirmasi
      pemicu={<Button size={ukuran} variant={subBagianKode ? "outline" : "default"} disabled={sibuk || nonaktif}>{ikon}{label}</Button>}
      judul={subBagianKode ? "Generate ulang sub-bagian ini?" : "Generate ulang seluruh kriteria?"}
      deskripsi="Hasil baru disimpan sebagai versi baru. Draf dan suntingan lama tetap ada di Riwayat versi dan bisa dipulihkan."
      labelAksi="Generate ulang"
      berbahaya={false}
      onKonfirmasi={mulai}
    />
  );
}

export function TombolTandaiSelesai({ proyekId, bagianKode, selesai }: { proyekId: string; bagianKode: string; selesai: boolean }) {
  const { sibuk, jalankan } = useAksi();
  if (selesai) return null;
  return (
    <Button
      variant="outline"
      disabled={sibuk}
      onClick={() => jalankan(() => aksiTandaiBagianSelesai(proyekId, bagianKode), { sukses: "Semua sub-bagian ditandai selesai." })}
    >
      {sibuk ? <IkonSibuk sibuk /> : <CheckCheck aria-hidden />}
      Tandai selesai
    </Button>
  );
}
