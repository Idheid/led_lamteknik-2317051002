"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { PetaTS } from "@/modules/led/komponen/peta-ts";
import { formatTahunAkademik } from "@/modules/bersama/domain/tahun-akademik";
import { aksiUbahTs } from "../aksi";

export function DialogUbahTs({ proyekId, tsTahunMulai }: { proyekId: string; tsTahunMulai: number }) {
  const [buka, setBuka] = useState(false);
  const [ts, setTs] = useState(String(tsTahunMulai));
  const { sibuk, jalankan } = useAksi();
  const n = Number(ts);
  const sah = Number.isInteger(n) && n >= 2000 && n <= 2100;
  return (
    <Dialog open={buka} onOpenChange={(b) => { setBuka(b); setTs(String(tsTahunMulai)); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ubah tahun TS">
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah tahun TS</DialogTitle>
          <DialogDescription>TS adalah tahun akademik penuh terakhir saat usulan akreditasi diajukan.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="ts-baru">Tahun mulai TS</FieldLabel>
          <div className="flex items-center gap-3">
            <Input id="ts-baru" type="number" className="w-28" value={ts} onChange={(e) => setTs(e.target.value)} />
            <span className="text-sm text-muted-foreground">TS = {sah ? formatTahunAkademik(n) : "—"}</span>
          </div>
          <FieldDescription>Contoh: pengajuan Oktober 2026 → TS 2025/2026.</FieldDescription>
        </Field>
        {sah && <PetaTS tsTahunMulai={n} />}
        <DialogFooter>
          <Button
            disabled={!sah || sibuk}
            onClick={() => jalankan(() => aksiUbahTs(proyekId, n), { sukses: "Tahun TS diperbarui.", lalu: () => setBuka(false) })}
          >
            <IkonSibuk sibuk={sibuk} />
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
