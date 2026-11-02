"use client";

import { Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiKonfirmasiBerkas, aksiTandaiBerkasUsang } from "../aksi";

/** Centang wajib sebelum ekstraksi (tahun tidak tertulis di teks berkas, atau skema berbeda). Perbaikan 2 Nov 2026. */
export function CentangKonfirmasi({ versiId, jenis, teks, nonaktif }: { versiId: string; jenis: "tahun" | "skema"; teks: string; nonaktif: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const id = `konfirmasi-${jenis}`;
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={sibuk}
        disabled={nonaktif || sibuk}
        onCheckedChange={(c) => {
          if (c === true) jalankan(() => aksiKonfirmasiBerkas(versiId, jenis), { sukses: "Konfirmasi dicatat." });
        }}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-sm leading-snug">{teks}</label>
    </div>
  );
}

/** Tandai berkas versi lama usang setelah instrumen tahun yang lebih baru diaktifkan. */
export function TombolTandaiUsang({ versiId, tahunBaru }: { versiId: string; tahunBaru: number }) {
  const { jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={<Button variant="outline" size="sm"><Archive aria-hidden />Tandai berkas usang</Button>}
      judul="Tandai berkas versi ini usang?"
      deskripsi={`Sudah ada instrumen aktif tahun ${tahunBaru} untuk jenjang ini. Setelah ditandai, berkas versi ini ditolak bila diunggah lagi. Berkas yang juga dipakai instrumen aktif tidak ditandai.`}
      labelAksi="Tandai usang"
      berbahaya={false}
      onKonfirmasi={() => jalankan(() => aksiTandaiBerkasUsang(versiId), {
        lalu: (r) => toast.success((r.ditandai.length ? `Ditandai usang: ${r.ditandai.join(", ")}.` : "Tidak ada berkas yang ditandai.")
          + (r.dilewati.length ? ` Dilewati karena dipakai instrumen aktif: ${r.dilewati.join(", ")}.` : "")),
      })}
    />
  );
}
