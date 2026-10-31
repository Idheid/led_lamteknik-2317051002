"use client";

import { toast } from "sonner";
import { CheckCheck, RefreshCw, Sparkles } from "lucide-react";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { Button } from "@/components/ui/button";
import { aksiMulaiGenerate, aksiTandaiBagianSelesai } from "@/app/led/(penyusun)/aksi";

/**
 * Tombol "Generate semua" (semua sub-bagian kriteria) atau "Generate" satu sub-bagian. `peringatan` (mis. AF/SWOT
 * tanpa draf IKU) ditampilkan sebagai konfirmasi sebelum generate.
 */
export function TombolGenerate({
  proyekId, bagianKode, subBagianKode, label, sudahAda, nonaktif, ukuran = "default", peringatan,
}: {
  proyekId: string;
  bagianKode: string;
  subBagianKode?: string;
  label: string;
  sudahAda: boolean;
  nonaktif?: boolean;
  ukuran?: "default" | "sm";
  peringatan?: string | null;
}) {
  const { sibuk, jalankan } = useAksi();
  const mulai = () => jalankan(() => aksiMulaiGenerate(proyekId, bagianKode, subBagianKode), {
    lalu: (t) => t.status === "tertunda"
      ? toast.warning(t.pesan ?? "Penyusunan menunggu kunci API.")
      : toast.success("Masuk antrean penyusunan. Anda boleh meninggalkan halaman ini; hasilnya muncul otomatis."),
  });
  const ikon = sibuk ? <IkonSibuk sibuk /> : sudahAda ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />;
  if (peringatan) {
    return (
      <TombolKonfirmasi
        pemicu={<Button size={ukuran} variant={sudahAda ? "outline" : "default"} disabled={sibuk || nonaktif}>{ikon}{label}</Button>}
        judul="Generate tetap dijalankan?"
        deskripsi={sudahAda ? `${peringatan} Hasil lama tetap ada di Riwayat versi.` : peringatan}
        labelAksi="Tetap generate"
        berbahaya={false}
        onKonfirmasi={mulai}
      />
    );
  }
  if (!sudahAda) {
    return <Button size={ukuran} disabled={sibuk || nonaktif} onClick={mulai}>{ikon}{label}</Button>;
  }
  return (
    <TombolKonfirmasi
      pemicu={<Button size={ukuran} variant={subBagianKode ? "outline" : "default"} disabled={sibuk || nonaktif}>{ikon}{label}</Button>}
      judul={subBagianKode ? "Generate ulang sub-bagian ini?" : "Generate ulang semua sub-bagian?"}
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
