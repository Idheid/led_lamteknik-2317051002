"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiMulaiIndeksUlang } from "./aksi";

interface Status {
  perlu: { potongan: number; dokumen: number; permintaan: number };
  terakhir: { status: string; total: number; selesai: number; permintaan: number; pesan: string | null } | null;
}

/**
 * Rencana 10 Nov T4: kepala konteks untuk potongan lama. Perkiraan permintaan embedding ditampilkan sebelum dijalankan;
 * ID dan teks potongan tidak berubah.
 */
export function IndeksUlang({ status }: { status: Status }) {
  const { sibuk, jalankan } = useAksi();
  const t = status.terakhir;
  const berjalan = t?.status === "antre" || t?.status === "berjalan";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kepala konteks potongan</CardTitle>
        <CardDescription>
          Setiap potongan diberi keterangan asalnya (dokumen, jenis, halaman, bagian) supaya lebih mudah ditemukan. Dokumen
          baru otomatis; potongan lama perlu diindeks ulang sekali. Teks dan ID potongan tidak berubah.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {berjalan ? (
          <p>Sedang berjalan: {t!.selesai.toLocaleString("id-ID")} dari {t!.total.toLocaleString("id-ID")} potongan, {t!.permintaan} permintaan embedding.</p>
        ) : status.perlu.potongan === 0 ? (
          <p className="text-muted-foreground">Semua potongan sudah berkepala konteks.{t?.status === "selesai" ? ` Terakhir: ${t.selesai.toLocaleString("id-ID")} potongan, ${t.permintaan} permintaan embedding.` : ""}</p>
        ) : (
          <>
            <p>
              {status.perlu.potongan.toLocaleString("id-ID")} potongan dari {status.perlu.dokumen} dokumen perlu diindeks ulang. Perkiraan:{" "}
              <span className="font-medium">{status.perlu.permintaan} permintaan embedding</span> (batch 100 potongan).
            </p>
            {t?.status === "gagal" && <p className="text-destructive">Percobaan terakhir gagal: {t.pesan}</p>}
            <TombolKonfirmasi
              pemicu={<Button className="w-fit" disabled={sibuk}><IkonSibuk sibuk={sibuk} />{!sibuk && <RefreshCw aria-hidden />}Indeks ulang potongan</Button>}
              judul="Indeks ulang potongan?"
              deskripsi={`${status.perlu.permintaan} permintaan embedding akan dikirim memakai kunci API fakultas. Berjalan di latar belakang.`}
              labelAksi="Jalankan"
              berbahaya={false}
              onKonfirmasi={() => jalankan(() => aksiMulaiIndeksUlang(), { sukses: "Indeks ulang diantre." })}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
