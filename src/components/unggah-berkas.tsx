"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  accept: string;
  label?: string;
  keterangan?: ReactNode;
  multiple?: boolean;
  /** isian tambahan FormData (subBagianKode, dokumenDiharapkanId, ...) */
  isian?: Record<string, string | null | undefined>;
  ringkas?: boolean;
  onSelesai?: () => void;
}

/** Unggah berkas lewat Route Handler (bukan aksi server: batas 1 MB). Bisa klik atau seret-lepas. */
export function UnggahBerkas({ url, accept, label = "Pilih berkas", keterangan, multiple, isian, ringkas, onSelesai }: Props) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [seret, setSeret] = useState(false);

  async function kirim(berkas: FileList | File[]) {
    const daftar = [...berkas];
    if (daftar.length === 0) return;
    const f = new FormData();
    for (const b of daftar) f.append("berkas", b);
    for (const [k, v] of Object.entries(isian ?? {})) if (v) f.append(k, v);
    setSibuk(true);
    try {
      const r = await fetch(url, { method: "POST", body: f });
      const data = (await r.json().catch(() => ({}))) as { pesan?: string };
      if (!r.ok) {
        toast.error(data.pesan ?? `Unggah gagal (${r.status}).`);
        return;
      }
      toast.success(daftar.length > 1 ? `${daftar.length} berkas diunggah. Diproses di latar.` : `${daftar[0].name} diunggah. Diproses di latar.`);
      onSelesai?.();
      router.refresh();
    } catch {
      toast.error("Koneksi terputus saat mengunggah. Coba lagi.");
    } finally {
      setSibuk(false);
      if (masukan.current) masukan.current.value = "";
    }
  }

  const input = (
    <input
      ref={masukan}
      type="file"
      accept={accept}
      multiple={multiple}
      className="sr-only"
      onChange={(e) => e.target.files && kirim(e.target.files)}
      aria-label={label}
    />
  );

  if (ringkas) {
    return (
      <>
        {input}
        <Button type="button" variant="outline" size="sm" disabled={sibuk} onClick={() => masukan.current?.click()}>
          {sibuk ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          {label}
        </Button>
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
      onDragLeave={() => setSeret(false)}
      onDrop={(e) => { e.preventDefault(); setSeret(false); void kirim(e.dataTransfer.files); }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
        seret ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {input}
      <Upload className="size-6 text-muted-foreground" aria-hidden />
      <Button type="button" disabled={sibuk} onClick={() => masukan.current?.click()}>
        {sibuk && <Loader2 className="animate-spin" aria-hidden />}
        {sibuk ? "Mengunggah…" : label}
      </Button>
      <p className="text-xs text-muted-foreground">atau seret berkas ke sini</p>
      {keterangan && <div className="text-xs text-muted-foreground">{keterangan}</div>}
    </div>
  );
}
