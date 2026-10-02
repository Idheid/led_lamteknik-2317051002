import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { ambilPengaturan } from "@/lib/data/pengaturan";
import { formatAngka } from "@/lib/domain/teks";
import { modelUsang } from "@/lib/domain/model-llm";
import { fmtWaktu } from "@/lib/tampil";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormModel, TombolMuatDaftar } from "./form-model";

export const metadata: Metadata = { title: "Model LLM" };

export default async function HalamanModel() {
  const p = await wajibSuperAdmin();
  const { atur, narasi, embedding, perModel } = await ambilPengaturan(p);
  return (
    <>
      <JudulHalaman
        judul="Model LLM"
        deskripsi="Pilih model Gemini untuk menyusun narasi, urutan model cadangan, dan model embedding untuk mengindeks dokumen."
        aksi={<TombolMuatDaftar />}
      />
      <Petunjuk
        kunci="admin-model"
        fungsi="Daftar model diambil langsung dari Google (models.list) memakai kunci API yang tersedia, sehingga hanya model yang benar-benar bisa dipakai kunci tersebut yang muncul."
        langkah={[
          "Klik Muat ulang daftar bila daftar kosong atau sudah lama (misalnya setelah Google merilis model baru).",
          "Pilih model narasi, lalu klik Uji model untuk memastikan model menjawab.",
          "Tambahkan satu atau dua model cadangan; dipakai berurutan bila kuota model narasi habis.",
          "Ganti model embedding hanya bila perlu: semua dokumen akan diindeks ulang.",
          "Klik Simpan.",
        ]}
      />
      {narasi.length === 0 && (
        <Alert>
          <AlertTitle>Daftar model belum dimuat</AlertTitle>
          <AlertDescription>
            Klik Muat ulang daftar. Diperlukan minimal satu kunci API aktif (kunci cadangan super admin atau kunci prodi).
          </AlertDescription>
        </Alert>
      )}
      {modelUsang(atur.modelNarasi) && (
        <Alert variant="destructive">
          <AlertTitle>Model narasi generasi lama</AlertTitle>
          <AlertDescription>
            {atur.modelNarasi} dibatasi Google untuk pengguna baru. Muat ulang daftar untuk mengganti otomatis ke model 3.x.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pengaturan</CardTitle>
            <CardDescription>
              {atur.daftarModelDiperbarui
                ? `Daftar model dimuat ${fmtWaktu.format(atur.daftarModelDiperbarui)}: ${narasi.length} model narasi, ${embedding.length} model embedding.`
                : "Daftar model belum pernah dimuat."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormModel
              awal={{
                modelNarasi: atur.modelNarasi,
                modelCadangan: atur.modelCadangan,
                modelEmbedding: atur.modelEmbedding,
                pakaiCadanganAdmin: atur.pakaiCadanganAdmin,
              }}
              narasi={narasi}
              embedding={embedding}
            />
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
                  <li key={m.model} className="flex justify-between gap-2 py-2">
                    <span className="font-mono break-all">{m.model}</span>
                    <span className="shrink-0 tabular-nums">{formatAngka(m.jumlah, 0)} potongan</span>
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
