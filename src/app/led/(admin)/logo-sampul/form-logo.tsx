"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IkonSibuk, TombolKonfirmasi } from "@/components/aksi-klien";

/** Unggah atau hapus logo sampul LED (D8). */
export function FormLogo({ ada }: { ada: boolean }) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);

  async function kirim(init: RequestInit, sukses: string) {
    setSibuk(true);
    try {
      const r = await fetch("/api/led/logo-sampul", init);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data.pesan ?? `Gagal (${r.status}).`);
      toast.success(sukses);
      router.refresh();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setSibuk(false);
      if (masukan.current) masukan.current.value = "";
    }
  }

  function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    const f = new FormData();
    f.append("berkas", berkas);
    void kirim({ method: "POST", body: f }, "Logo disimpan. Ekspor LED berikutnya memakai logo ini.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input ref={masukan} type="file" accept="image/png,image/jpeg" className="sr-only" id="berkas-logo" onChange={pilih} />
      <Button type="button" disabled={sibuk} onClick={() => masukan.current?.click()}>
        <IkonSibuk sibuk={sibuk} />{!sibuk && <ImageUp aria-hidden />}{ada ? "Ganti logo" : "Unggah logo"}
      </Button>
      {ada && (
        <TombolKonfirmasi
          pemicu={<Button type="button" variant="outline" disabled={sibuk}><Trash2 aria-hidden />Hapus logo</Button>}
          judul="Hapus logo sampul?"
          deskripsi="Ekspor LED berikutnya kembali memakai kotak “Logo Perguruan Tinggi” dari template."
          onKonfirmasi={() => kirim({ method: "DELETE" }, "Logo dihapus.")}
        />
      )}
    </div>
  );
}
