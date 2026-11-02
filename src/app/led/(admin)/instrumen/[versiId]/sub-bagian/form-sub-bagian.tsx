"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { PilihJenjang } from "@/modules/led/komponen/pilih-jenjang";
import { skemaSubBagian, TIPE_SUB_BAGIAN, type MasukanSubBagian } from "@/modules/led/validasi";
import { aksiSimpanSubBagian } from "@/app/led/(admin)/instrumen/aksi";

const KET_TIPE: Record<(typeof TIPE_SUB_BAGIAN)[number], string> = {
  data: "Diisi dari data proyek (tidak di-generate)",
  narasi: "Narasi tanpa butir penilaian",
  bersama: "Latar belakang, kebijakan, analisis faktor, SWOT",
  iku: "Indikator kinerja yang punya butir penilaian",
  otomatis: "Dibuat otomatis (daftar isi dsb.)",
};

export function FormSubBagian({
  versiId, bagianId, id, awal, terkunci,
}: { versiId: string; bagianId: string; id?: string; awal: MasukanSubBagian; terkunci: boolean }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanSubBagian>({ resolver: zodResolver(skemaSubBagian), defaultValues: awal });
  const varian = useFieldArray({ control: form.control, name: "varian" });
  const kembali = `/led/instrumen/${versiId}/bagian/${bagianId}`;
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiSimpanSubBagian(bagianId, nilai, id), {
      sukses: id ? "Sub-bagian disimpan." : "Sub-bagian ditambahkan.",
      lalu: () => router.push(kembali),
    }),
  );
  return (
    <form onSubmit={kirim} noValidate>
      <fieldset disabled={terkunci || sibuk} className="grid gap-6 xl:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Identitas</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="kode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sb-kode">Kode</FieldLabel>
                    <Input {...field} id="sb-kode" className="font-mono" placeholder="C.3-IKU-a.01" aria-invalid={fieldState.invalid} />
                    <FieldDescription>Unik dalam versi; dipakai sebagai placeholder di template ekspor.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="label"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="sb-label">Nomor tampilan</FieldLabel>
                      <Input {...field} id="sb-label" placeholder="3.a.i" />
                    </Field>
                  )}
                />
                <Controller
                  name="urutan"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="sb-urutan">Urutan</FieldLabel>
                      <Input id="sb-urutan" type="number" min={0} value={String(field.value ?? 0)} onChange={(e) => field.onChange(e.target.value)} />
                    </Field>
                  )}
                />
              </div>
              <Controller
                name="judul"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sb-judul">Judul</FieldLabel>
                    <Textarea {...field} id="sb-judul" rows={2} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="grup"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sb-grup">Grup (opsional)</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id="sb-grup" placeholder="contoh: a. Pendidikan" />
                  </Field>
                )}
              />
              <Controller
                name="tipe"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sb-tipe">Tipe</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={terkunci}>
                      <SelectTrigger id="sb-tipe" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPE_SUB_BAGIAN.map((t) => (
                          <SelectItem key={t} value={t}>{t} — {KET_TIPE[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="berlakuUntuk"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Berlaku untuk jenjang</FieldLabel>
                    <PilihJenjang idAwal="sb-berlaku" nilai={field.value} onUbah={field.onChange} nonaktif={terkunci} />
                    <FieldDescription>Sub-bagian hanya tampil di proyek dengan jenjang yang dicentang.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="catatan"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="sb-catatan">Catatan pengembang</FieldLabel>
                    <Textarea {...field} value={field.value ?? ""} id="sb-catatan" rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Instruksi per varian jenjang</CardTitle>
            <CardDescription>
              Template LEDPS kadang memberi instruksi berbeda untuk jenjang berbeda. Instruksi ini ditampilkan ke penyusun
              dan dipakai di prompt generate.
            </CardDescription>
            {!terkunci && (
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => varian.append({ instruksi: "", jenjang: [], catatanTemplate: "" })}
                >
                  <Plus aria-hidden />
                  Tambah varian
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {form.formState.errors.varian?.root && <FieldError errors={[form.formState.errors.varian.root]} />}
            {form.formState.errors.varian?.message && <FieldError errors={[form.formState.errors.varian]} />}
            {varian.fields.map((f, i) => (
              <div key={f.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Varian {i + 1}</span>
                  {!terkunci && varian.fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus varian ${i + 1}`} onClick={() => varian.remove(i)}>
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
                <FieldGroup>
                  <Controller
                    name={`varian.${i}.instruksi`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`v-${i}-instruksi`}>Instruksi</FieldLabel>
                        <Textarea {...field} id={`v-${i}-instruksi`} rows={5} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`varian.${i}.jenjang`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Jenjang varian ini</FieldLabel>
                        <PilihJenjang idAwal={`v-${i}`} nilai={field.value} onUbah={field.onChange} nonaktif={terkunci} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`varian.${i}.catatanTemplate`}
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={`v-${i}-catatan`}>Catatan biru template</FieldLabel>
                        <Input {...field} value={field.value ?? ""} id={`v-${i}-catatan`} placeholder="(Penjelasan disampaikan oleh pengusul …)" />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </div>
            ))}
          </CardContent>
        </Card>
        {!terkunci && (
          <div className="flex gap-2 xl:col-span-3">
            <Button type="submit">
              <IkonSibuk sibuk={sibuk} />
              Simpan sub-bagian
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(kembali)}>Batal</Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}
