"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { toast } from "sonner";
import { pesanGalatZod, skemaButir, type MasukanButir } from "@/lib/validasi";
import { aksiHapusButir, aksiSimpanButir } from "@/app/admin/aksi";

export interface PilihanSub {
  id: string;
  kode: string;
  label: string;
  judul: string;
  bagian: string;
}

/** Nilai form: daftar teks disunting sebagai satu baris per butir. */
interface NilaiForm {
  kode: string;
  no: string;
  sub: string;
  urutan: string;
  bagianKode: string;
  elemen: string;
  indikator: string;
  bobot: string;
  jenis: "narasi" | "angka";
  tabelLkps: string;
  deskriptorSkor4: string;
  unsurSkor4: string;
  pertanyaanPemandu: string;
  dokumenPendukung: string;
  subBagianIds: string[];
  catatan: string;
}

const baris = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

export function FormButir({
  versiId, id, jenjang, awal, pilihanSub, bagianKode, terkunci,
}: {
  versiId: string;
  id?: string;
  jenjang: MasukanButir["jenjang"];
  awal: MasukanButir;
  pilihanSub: PilihanSub[];
  bagianKode: string[];
  terkunci: boolean;
}) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [cari, setCari] = useState("");
  const [n, setN] = useState<NilaiForm>({
    kode: awal.kode, no: String(awal.no ?? ""), sub: awal.sub ?? "", urutan: String(awal.urutan ?? ""),
    bagianKode: awal.bagianKode, elemen: awal.elemen, indikator: awal.indikator,
    bobot: id ? String(awal.bobot ?? "").replace(".", ",") : "",
    jenis: awal.jenis, tabelLkps: awal.tabelLkps.join(", "), deskriptorSkor4: awal.deskriptorSkor4,
    unsurSkor4: awal.unsurSkor4.join("\n"), pertanyaanPemandu: awal.pertanyaanPemandu ?? "",
    dokumenPendukung: awal.dokumenPendukung.join("\n"), subBagianIds: awal.subBagianIds, catatan: awal.catatan ?? "",
  });
  const ubah = <K extends keyof NilaiForm>(k: K, v: NilaiForm[K]) => setN((x) => ({ ...x, [k]: v }));
  const kembali = `/admin/instrumen/${versiId}/butir?jenjang=${jenjang}`;
  const tersaring = useMemo(() => {
    const c = cari.trim().toLowerCase();
    return pilihanSub.filter((s) => n.subBagianIds.includes(s.id) || !c || `${s.kode} ${s.judul}`.toLowerCase().includes(c));
  }, [cari, pilihanSub, n.subBagianIds]);

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    const masukan: MasukanButir = {
      jenjang, kode: n.kode, no: n.no, sub: n.sub, urutan: n.urutan, bagianKode: n.bagianKode, elemen: n.elemen,
      indikator: n.indikator, bobot: n.bobot.replace(",", "."), jenis: n.jenis,
      tabelLkps: n.tabelLkps.split(",").map((x) => x.trim()).filter(Boolean),
      deskriptorSkor4: n.deskriptorSkor4, unsurSkor4: baris(n.unsurSkor4), pertanyaanPemandu: n.pertanyaanPemandu,
      dokumenPendukung: baris(n.dokumenPendukung), subBagianIds: n.subBagianIds, catatan: n.catatan,
    };
    const cek = skemaButir.safeParse(masukan);
    if (!cek.success) {
      toast.error(pesanGalatZod(cek.error));
      return;
    }
    jalankan(() => aksiSimpanButir(versiId, masukan, id), {
      sukses: id ? "Butir disimpan." : "Butir ditambahkan.",
      lalu: () => router.push(kembali),
    });
  }

  return (
    <form onSubmit={simpan} noValidate>
      <fieldset disabled={terkunci || sibuk} className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Butir dan deskriptor</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="b-kode">Kode</FieldLabel>
                  <Input id="b-kode" className="font-mono" value={n.kode} onChange={(e) => ubah("kode", e.target.value)} placeholder="4-I" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="b-no">Nomor</FieldLabel>
                  <Input id="b-no" type="number" value={n.no} onChange={(e) => ubah("no", e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="b-sub">Sub</FieldLabel>
                  <Input id="b-sub" value={n.sub} onChange={(e) => ubah("sub", e.target.value)} placeholder="I / II" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="b-urutan">Urutan</FieldLabel>
                  <Input id="b-urutan" type="number" value={n.urutan} onChange={(e) => ubah("urutan", e.target.value)} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="b-elemen">Elemen</FieldLabel>
                <Input id="b-elemen" value={n.elemen} onChange={(e) => ubah("elemen", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="b-indikator">Indikator</FieldLabel>
                <Textarea id="b-indikator" rows={2} value={n.indikator} onChange={(e) => ubah("indikator", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="b-deskriptor">Deskriptor skor 4</FieldLabel>
                <Textarea id="b-deskriptor" rows={4} value={n.deskriptorSkor4} onChange={(e) => ubah("deskriptorSkor4", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="b-unsur">Unsur skor 4</FieldLabel>
                <Textarea id="b-unsur" rows={5} value={n.unsurSkor4} onChange={(e) => ubah("unsurSkor4", e.target.value)} />
                <FieldDescription>Satu unsur per baris. Menjadi daftar cek di halaman kriteria.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="b-pemandu">Pertanyaan pemandu</FieldLabel>
                <Textarea id="b-pemandu" rows={3} value={n.pertanyaanPemandu} onChange={(e) => ubah("pertanyaanPemandu", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="b-dokumen">Dokumen pendukung yang diharapkan</FieldLabel>
                <Textarea id="b-dokumen" rows={4} value={n.dokumenPendukung} onChange={(e) => ubah("dokumenPendukung", e.target.value)} />
                <FieldDescription>Satu dokumen per baris.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="b-catatan">Catatan</FieldLabel>
                <Textarea id="b-catatan" rows={2} value={n.catatan} onChange={(e) => ubah("catatan", e.target.value)} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Penilaian</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="b-bobot">Bobot</FieldLabel>
                    <Input id="b-bobot" inputMode="decimal" value={n.bobot} onChange={(e) => ubah("bobot", e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="b-jenis">Jenis</FieldLabel>
                    <Select value={n.jenis} onValueChange={(v) => ubah("jenis", v as NilaiForm["jenis"])} disabled={terkunci}>
                      <SelectTrigger id="b-jenis" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narasi">narasi</SelectItem>
                        <SelectItem value="angka">angka</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="b-bagian">Bagian (untuk anggaran)</FieldLabel>
                  <Select value={n.bagianKode} onValueChange={(v) => ubah("bagianKode", v)} disabled={terkunci}>
                    <SelectTrigger id="b-bagian" className="w-full"><SelectValue placeholder="Pilih bagian" /></SelectTrigger>
                    <SelectContent>
                      {bagianKode.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldDescription>Butir angka mendapat setengah porsi kata butir narasi.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="b-tabel">Tabel LKPS</FieldLabel>
                  <Input id="b-tabel" className="font-mono" value={n.tabelLkps} onChange={(e) => ubah("tabelLkps", e.target.value)} placeholder="4.a, 4.b" />
                  <FieldDescription>Pisahkan dengan koma.</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dinilai di sub-bagian</CardTitle>
              <CardDescription>{n.subBagianIds.length} dipilih</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Cari kode atau judul…" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari sub-bagian" />
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
                {tersaring.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                    <Checkbox
                      className="mt-0.5"
                      checked={n.subBagianIds.includes(s.id)}
                      onCheckedChange={(b) =>
                        ubah("subBagianIds", b ? [...n.subBagianIds, s.id] : n.subBagianIds.filter((x) => x !== s.id))
                      }
                    />
                    <span>
                      <span className="font-mono text-xs text-muted-foreground">{s.kode}</span>
                      <span className="block leading-snug">{s.judul}</span>
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {!terkunci && (
          <div className="flex flex-wrap gap-2 xl:col-span-3">
            <Button type="submit">
              <IkonSibuk sibuk={sibuk} />
              Simpan butir
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(kembali)}>Batal</Button>
            {id && (
              <TombolKonfirmasi
                pemicu={
                  <Button type="button" variant="destructive" className="ml-auto">
                    <Trash2 aria-hidden />
                    Hapus butir
                  </Button>
                }
                judul={`Hapus butir ${awal.kode}?`}
                deskripsi="Pemetaan ke sub-bagian dan daftar dokumen pendukung butir ini ikut terhapus."
                onKonfirmasi={() => jalankan(() => aksiHapusButir(id), { sukses: "Butir dihapus.", lalu: () => router.push(kembali) })}
              />
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}
