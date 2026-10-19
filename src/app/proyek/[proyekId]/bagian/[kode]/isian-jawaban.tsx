"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { daftarkanPenyimpan } from "@/lib/simpan-tertunda";
import { aksiSimpanJawaban } from "@/app/proyek/aksi";

type Status = "tersimpan" | "berubah" | "menyimpan" | "gagal";

const JEDA_SIMPAN_MS = 1200;

/**
 * Jawaban penyusun (sumber "J" di prompt). Simpan otomatis; disimpan juga sebelum pindah halaman
 * (Sebelumnya/Berikutnya) dan saat komponen dilepas; peringatan bila menutup tab sebelum tersimpan.
 */
export function IsianJawaban({ proyekId, subBagianKode, awal }: { proyekId: string; subBagianKode: string; awal: string }) {
  const [isi, setIsi] = useState(awal);
  const [status, setStatus] = useState<Status>("tersimpan");
  const [pesan, setPesan] = useState<string | null>(null);
  const tersimpan = useRef(awal);
  const terkini = useRef(awal);
  const pewaktu = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function simpan(nilai: string): Promise<boolean> {
    if (nilai === tersimpan.current) {
      setStatus((s) => (s === "gagal" ? s : "tersimpan"));
      return true;
    }
    setStatus("menyimpan");
    const r = await aksiSimpanJawaban(proyekId, subBagianKode, nilai);
    if (r.ok) {
      tersimpan.current = nilai;
      setPesan(null);
      setStatus((s) => (s === "menyimpan" ? "tersimpan" : s));
      return true;
    }
    setPesan(r.pesan);
    setStatus("gagal");
    return false;
  }

  /** Simpan sekarang tanpa menunggu jeda. */
  function simpanSegera(): Promise<boolean> {
    if (pewaktu.current) {
      clearTimeout(pewaktu.current);
      pewaktu.current = null;
    }
    return simpan(terkini.current);
  }
  const simpanSegeraRef = useRef(simpanSegera);
  useEffect(() => {
    simpanSegeraRef.current = simpanSegera;
  });

  useEffect(() => {
    if (status !== "berubah" && status !== "menyimpan") return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [status]);

  useEffect(() => {
    const lepas = daftarkanPenyimpan(() => simpanSegeraRef.current());
    return () => {
      lepas();
      // dilepas (pindah halaman lewat tautan lain): simpan ketikan yang masih tertunda
      if (pewaktu.current) void simpanSegeraRef.current();
    };
  }, []);

  function ubah(nilai: string) {
    setIsi(nilai);
    terkini.current = nilai;
    setStatus("berubah");
    if (pewaktu.current) clearTimeout(pewaktu.current);
    pewaktu.current = setTimeout(() => {
      pewaktu.current = null;
      void simpan(nilai);
    }, JEDA_SIMPAN_MS);
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
      <Textarea
        id={id}
        rows={6}
        value={isi}
        onChange={(e) => ubah(e.target.value)}
        onBlur={() => void simpanSegera()}
        placeholder="Jawab instruksi template di atas dengan fakta: angka, nama kegiatan, nomor dan tanggal dokumen. Sistem hanya memakai fakta yang Anda berikan atau yang ada di dokumen."
      />
      <FieldDescription>{pesan ?? "Disimpan otomatis, juga saat Anda pindah ke halaman lain. Menjadi sumber [J] saat narasi disusun."}</FieldDescription>
    </Field>
  );
}
