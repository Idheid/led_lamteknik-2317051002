"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { daftarkanPenyimpan } from "@/modules/bersama/simpan-tertunda";
import { aksiSimpanTarget } from "@/app/led/(penyusun)/aksi";

type Status = "tersimpan" | "berubah" | "menyimpan" | "gagal";
const JEDA_SIMPAN_MS = 1000;

interface NilaiTarget {
  target: string;
  satuan: string;
  sumber: string;
  lebihKecil: boolean;
}

/**
 * Target opsional satu butir angka (revisi 22 Okt 2026). Capaian, persen capaian, status, dan tren dihitung sistem
 * setelah tersimpan; AI hanya menjelaskannya. Disimpan otomatis dan sebelum pindah halaman.
 */
export function IsianTarget({ proyekId, butirKode, awal }: { proyekId: string; butirKode: string; awal: NilaiTarget }) {
  const router = useRouter();
  const [isi, setIsi] = useState(awal);
  const [status, setStatus] = useState<Status>("tersimpan");
  const [pesan, setPesan] = useState<string | null>(null);
  const tersimpan = useRef(JSON.stringify(awal));
  const terkini = useRef(awal);
  const pewaktu = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function simpan(): Promise<boolean> {
    if (pewaktu.current) {
      clearTimeout(pewaktu.current);
      pewaktu.current = null;
    }
    const x = terkini.current;
    if (JSON.stringify(x) === tersimpan.current) return true;
    setStatus("menyimpan");
    const r = await aksiSimpanTarget(proyekId, { butirKode, ...x });
    if (r.ok) {
      tersimpan.current = JSON.stringify(x);
      setPesan(null);
      setStatus((s) => (s === "menyimpan" ? "tersimpan" : s));
      router.refresh();
      return true;
    }
    setPesan(r.pesan);
    setStatus("gagal");
    return false;
  }
  const simpanRef = useRef(simpan);
  useEffect(() => {
    simpanRef.current = simpan;
  });
  useEffect(() => {
    const lepas = daftarkanPenyimpan(() => simpanRef.current());
    return () => {
      lepas();
      if (pewaktu.current) void simpanRef.current();
    };
  }, []);

  function ubah(x: Partial<NilaiTarget>) {
    const baru = { ...terkini.current, ...x };
    terkini.current = baru;
    setIsi(baru);
    setStatus("berubah");
    if (pewaktu.current) clearTimeout(pewaktu.current);
    pewaktu.current = setTimeout(() => void simpan(), JEDA_SIMPAN_MS);
  }

  const id = `target-${butirKode}`;
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Target (opsional)</legend>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Target</span>
          <Input id={id} inputMode="decimal" value={isi.target} onChange={(e) => ubah({ target: e.target.value })} onBlur={() => void simpan()} placeholder="70" className="h-8 w-24" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Satuan</span>
          <Input value={isi.satuan} onChange={(e) => ubah({ satuan: e.target.value })} onBlur={() => void simpan()} placeholder="%" className="h-8 w-24" />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sumber target</span>
          <Input value={isi.sumber} onChange={(e) => ubah({ sumber: e.target.value })} onBlur={() => void simpan()} placeholder="Renstra FT 2021–2025" className="h-8" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <Checkbox checked={isi.lebihKecil} onCheckedChange={(c) => ubah({ lebihKecil: c === true })} />
        Nilai lebih kecil lebih baik (misalnya masa studi, waktu tunggu)
      </label>
      <p className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
        {status === "menyimpan" && <><Loader2 className="size-3 animate-spin" aria-hidden />Menyimpan…</>}
        {status === "berubah" && "Belum tersimpan"}
        {status === "tersimpan" && (isi.target ? <><Check className="size-3" aria-hidden />Tersimpan. Capaian dihitung sistem dan dievaluasi di narasi.</> : "Kosongkan bila tidak ada target.")}
        {status === "gagal" && <span className="flex items-center gap-1 text-destructive"><CircleAlert className="size-3" aria-hidden />{pesan ?? "Gagal menyimpan"}</span>}
      </p>
    </fieldset>
  );
}
