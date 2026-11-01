"use client";

import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiIngatkanTimProdi } from "./aksi";

/** Kirim pengingat LED periode berikutnya ke akun Tim Prodi prodi ini sekarang juga (L2). */
export function TombolIngatkan({ prodiId }: { prodiId: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <Button size="sm" variant="outline" disabled={sibuk}
      onClick={() => jalankan(() => aksiIngatkanTimProdi(prodiId), { lalu: (n) => toast.success(`Pengingat dikirim ke ${n} akun Tim Prodi.`) })}>
      <IkonSibuk sibuk={sibuk} /><BellRing aria-hidden />Ingatkan Tim Prodi
    </Button>
  );
}
