"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiAturHalamanBobot, aksiMulaiEkstraksi } from "../aksi";

/** Isian halaman tabel bobot di Pedoman Penilaian (nomor halaman PDF). */
export function IsianHalamanBobot({ versiId, awal, usulan, nonaktif }: { versiId: string; awal: string; usulan: string | null; nonaktif: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const [nilai, setNilai] = useState(awal);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiAturHalamanBobot(versiId, nilai), { sukses: "Halaman tabel bobot disimpan." });
      }}
    >
      <label htmlFor="halaman-bobot" className="text-xs text-muted-foreground">Halaman tabel bobot</label>
      <Input id="halaman-bobot" value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="223-227" className="h-8 w-32 font-mono" disabled={nonaktif} />
      <Button type="submit" size="sm" variant="outline" disabled={nonaktif || sibuk || nilai.trim() === awal}>
        <IkonSibuk sibuk={sibuk} />Simpan
      </Button>
      {usulan && <span className="text-xs text-muted-foreground">terdeteksi otomatis: {usulan}</span>}
    </form>
  );
}

/** Tombol mulai, lanjutkan, atau ulangi ekstraksi. */
export function TombolEkstraksi({ versiId, status, siap }: { versiId: string; status: string | null; siap: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const mulai = (ulang: boolean) => jalankan(() => aksiMulaiEkstraksi(versiId, ulang), {
    sukses: "Ekstraksi masuk antrean. Halaman ini diperbarui otomatis.",
  });
  if (status === "antre" || status === "berjalan") return null;
  const lanjut = status === "tertunda" || status === "gagal";
  return (
    <div className="flex flex-wrap gap-2">
      {!status && (
        <Button disabled={!siap || sibuk} onClick={() => mulai(false)}><IkonSibuk sibuk={sibuk} /><Play aria-hidden />Mulai ekstraksi</Button>
      )}
      {lanjut && (
        <Button disabled={!siap || sibuk} onClick={() => mulai(false)}><IkonSibuk sibuk={sibuk} /><Play aria-hidden />Lanjutkan ekstraksi</Button>
      )}
      {status && (
        <TombolKonfirmasi
          pemicu={<Button variant="outline" disabled={!siap || sibuk}><RotateCcw aria-hidden />Ekstrak ulang</Button>}
          judul="Ekstrak ulang dari awal?"
          deskripsi="Sub-bagian dan butir hasil ekstraksi sebelumnya, termasuk suntingan dan tanda sudah dicek, dihapus lalu dibuat ulang dari berkas yang terunggah."
          labelAksi="Ekstrak ulang"
          onKonfirmasi={() => mulai(true)}
        />
      )}
    </div>
  );
}
