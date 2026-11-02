"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { daftarkanPenyimpan } from "@/modules/bersama/simpan-tertunda";
import { aksiSimpanNilaiManual } from "@/app/led/(tim-prodi)/aksi";

type Status = "tersimpan" | "berubah" | "menyimpan" | "gagal";
const JEDA_SIMPAN_MS = 1000;

/**
 * Nilai hasil hitung butir angka yang diisi penyusun (butir tanpa rumus, atau rumus tidak bisa membaca LKPS).
 * Menjadi sumber data narasi. Disimpan otomatis dan sebelum pindah halaman.
 */
export function IsianNilaiManual({
  proyekId, butirKode, awal, alasan,
}: { proyekId: string; butirKode: string; awal: { nilai: string; keterangan: string }; alasan: string | null }) {
  const [nilai, setNilai] = useState(awal.nilai);
  const [keterangan, setKeterangan] = useState(awal.keterangan);
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
    const isi = terkini.current;
    if (JSON.stringify(isi) === tersimpan.current) return true;
    setStatus("menyimpan");
    const r = await aksiSimpanNilaiManual(proyekId, butirKode, isi.nilai, isi.keterangan);
    if (r.ok) {
      tersimpan.current = JSON.stringify(isi);
      setPesan(null);
      setStatus((s) => (s === "menyimpan" ? "tersimpan" : s));
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

  useEffect(() => {
    if (status !== "berubah" && status !== "menyimpan") return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [status]);

  function ubah(isi: { nilai: string; keterangan: string }) {
    terkini.current = isi;
    setStatus("berubah");
    if (pewaktu.current) clearTimeout(pewaktu.current);
    pewaktu.current = setTimeout(() => void simpan(), JEDA_SIMPAN_MS);
  }

  const id = `nilai-${butirKode}`;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nilai hitung butir {butirKode} (diisi penyusun)</div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
          {status === "menyimpan" && <><Loader2 className="size-3 animate-spin" aria-hidden />Menyimpan…</>}
          {status === "berubah" && "Belum tersimpan"}
          {status === "tersimpan" && nilai && <><Check className="size-3" aria-hidden />Tersimpan</>}
          {status === "gagal" && <span className="flex items-center gap-1 text-destructive"><CircleAlert className="size-3" aria-hidden />Gagal menyimpan</span>}
        </span>
      </div>
      {alasan && <p className="text-xs text-muted-foreground">{alasan}</p>}
      <Field>
        <FieldLabel htmlFor={id}>Nilai</FieldLabel>
        <Input
          id={id}
          value={nilai}
          onChange={(e) => { setNilai(e.target.value); ubah({ nilai: e.target.value, keterangan }); }}
          onBlur={() => void simpan()}
          placeholder="mis. 12,5% atau Rasio 1 : 18"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-ket`}>Cara menghitung dan sumber datanya</FieldLabel>
        <Textarea
          id={`${id}-ket`}
          rows={2}
          value={keterangan}
          onChange={(e) => { setKeterangan(e.target.value); ubah({ nilai, keterangan: e.target.value }); }}
          onBlur={() => void simpan()}
          placeholder="mis. 5 dosen bergelar doktor dari 40 DTPS (Tabel 4.a LKPS, TS)"
        />
        <FieldDescription>{pesan ?? "Menjadi sumber angka narasi. Kosongkan nilai untuk menghapus."}</FieldDescription>
      </Field>
    </div>
  );
}
