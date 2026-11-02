"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiKonfirmasiHasilAkreditasi, aksiTolakHasilAkreditasi } from "../aksi";

/** Konfirmasi atau tolak hasil akreditasi yang dicatat Tim Prodi (L1). */
export function KonfirmasiHasil({ riwayatId }: { riwayatId: string }) {
  const { sibuk, jalankan } = useAksi();
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  if (tolak) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Alasan penolakan" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan penolakan" className="h-8 w-56" />
        <Button size="sm" variant="destructive" disabled={sibuk} onClick={() => jalankan(() => aksiTolakHasilAkreditasi(riwayatId, alasan), { sukses: "Catatan ditolak." })}>
          <IkonSibuk sibuk={sibuk} />Tolak
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setTolak(false)}>Batal</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={sibuk} onClick={() => jalankan(() => aksiKonfirmasiHasilAkreditasi(riwayatId), { sukses: "Hasil akreditasi dikonfirmasi. Data prodi diperbarui." })}>
        <IkonSibuk sibuk={sibuk} /><Check aria-hidden />Konfirmasi
      </Button>
      <Button size="sm" variant="outline" onClick={() => setTolak(true)}><X aria-hidden />Tolak</Button>
    </div>
  );
}
