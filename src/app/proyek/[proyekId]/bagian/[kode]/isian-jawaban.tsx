"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { aksiSimpanJawaban } from "@/app/proyek/aksi";

type Status = "tersimpan" | "berubah" | "menyimpan" | "gagal";

const JEDA_SIMPAN_MS = 1200;

/** Jawaban penyusun (sumber "J" di prompt). Simpan otomatis; peringatan bila menutup halaman sebelum tersimpan. */
export function IsianJawaban({
  proyekId, subBagianKode, awal, pemandu,
}: { proyekId: string; subBagianKode: string; awal: string; pemandu: string[] }) {
  const [isi, setIsi] = useState(awal);
  const [status, setStatus] = useState<Status>("tersimpan");
  const [pesan, setPesan] = useState<string | null>(null);
  const tersimpan = useRef(awal);
  const pewaktu = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "berubah" && status !== "menyimpan") return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [status]);

  useEffect(() => () => { if (pewaktu.current) clearTimeout(pewaktu.current); }, []);

  async function simpan(nilai: string) {
    if (nilai === tersimpan.current) {
      setStatus("tersimpan");
      return;
    }
    setStatus("menyimpan");
    const r = await aksiSimpanJawaban(proyekId, subBagianKode, nilai);
    if (r.ok) {
      tersimpan.current = nilai;
      setPesan(null);
      setStatus((s) => (s === "menyimpan" ? "tersimpan" : s));
    } else {
      setPesan(r.pesan);
      setStatus("gagal");
    }
  }

  function ubah(nilai: string) {
    setIsi(nilai);
    setStatus("berubah");
    if (pewaktu.current) clearTimeout(pewaktu.current);
    pewaktu.current = setTimeout(() => void simpan(nilai), JEDA_SIMPAN_MS);
  }

  const id = `jawaban-${subBagianKode}`;
  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>Jawaban penyusun</FieldLabel>
        <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
          {status === "menyimpan" && <><Loader2 className="size-3 animate-spin" aria-hidden />Menyimpan…</>}
          {status === "berubah" && "Belum tersimpan"}
          {status === "tersimpan" && isi && <><Check className="size-3" aria-hidden />Tersimpan</>}
          {status === "gagal" && <span className="flex items-center gap-1 text-destructive"><CircleAlert className="size-3" aria-hidden />Gagal menyimpan</span>}
        </span>
      </div>
      {pemandu.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {pemandu.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      )}
      <Textarea
        id={id}
        rows={4}
        value={isi}
        onChange={(e) => ubah(e.target.value)}
        onBlur={() => {
          if (pewaktu.current) clearTimeout(pewaktu.current);
          void simpan(isi);
        }}
        placeholder="Tuliskan fakta, angka, nama kegiatan, dan nomor dokumen yang relevan. Sistem hanya memakai fakta yang Anda berikan atau yang ada di dokumen."
      />
      <FieldDescription>{pesan ?? "Disimpan otomatis. Menjadi sumber [J] saat narasi disusun."}</FieldDescription>
    </Field>
  );
}
