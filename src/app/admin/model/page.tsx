import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { ambilPengaturan } from "@/lib/data/pengaturan";
import { formatAngka } from "@/lib/domain/teks";
import { JudulHalaman } from "@/components/judul-halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormModel } from "./form-model";

export const metadata: Metadata = { title: "Model LLM" };

export default async function HalamanModel() {
  const p = await wajibSuperAdmin();
  const { atur, perModel } = await ambilPengaturan(p);
  return (
    <>
      <JudulHalaman
        judul="Model LLM"
        deskripsi="Model narasi dipakai mesin penyusun (iterasi 3). Mengganti model embedding membuat semua dokumen teks diproses ulang, karena embedding dari model berbeda tidak bisa dibandingkan."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengaturan</CardTitle>
          </CardHeader>
          <CardContent>
            <FormModel awal={{ modelNarasi: atur.modelNarasi, modelEmbedding: atur.modelEmbedding }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Potongan dokumen per model embedding</CardTitle>
            <CardDescription>Seluruh proyek. Hanya potongan dengan model yang berlaku yang dipakai pencarian.</CardDescription>
          </CardHeader>
          <CardContent>
            {perModel.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada dokumen yang diindeks.</p>
            ) : (
              <ul className="divide-y text-sm">
                {perModel.map((m) => (
                  <li key={m.model} className="flex justify-between py-2">
                    <span className="font-mono">{m.model}</span>
                    <span className="tabular-nums">{formatAngka(m.jumlah, 0)} potongan</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
