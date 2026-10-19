"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { JENJANG } from "@/lib/domain/instrumen";
import { aksiBuatVersiJenjang } from "./aksi";

const SANDI: Record<string, string> = { D1: "D1", D2: "D2", D3: "D3", S1: "S1", STr: "STR", S2: "S2", S2Tr: "S2TR", S3: "S3", S3Tr: "S3TR", PPI: "PPI" };

/** Instrumen baru untuk satu jenjang (revisi 19 Okt 2026); berkasnya diunggah di halaman berikutnya. */
export function TombolInstrumenBaru({ tahun }: { tahun: number }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [buka, setBuka] = useState(false);
  const [jenjang, setJenjang] = useState("S1");
  const [nama, setNama] = useState(`Instrumen LAM Teknik ${tahun} Sarjana`);
  const [kode, setKode] = useState(`LAMTEKNIK-${tahun}-S1`);
  const [peraturan, setPeraturan] = useState("");

  function pilihJenjang(j: string) {
    setJenjang(j);
    const n = JENJANG.find((x) => x.kode === j)?.nama ?? j;
    setNama(`Instrumen LAM Teknik ${tahun} ${n}`);
    setKode(`LAMTEKNIK-${tahun}-${SANDI[j] ?? j}`);
  }

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    jalankan(
      () => aksiBuatVersiJenjang({
        nama, kode: kode.toUpperCase(), jenjang: jenjang as "S1",
        peraturan: peraturan.split("\n").map((x) => x.trim()).filter(Boolean),
      }),
      { sukses: "Instrumen dibuat. Unggah tiga berkasnya.", lalu: (id) => { setBuka(false); router.push(`/proyek/instrumen/${id}`); } },
    );
  }

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button><Plus aria-hidden />Instrumen baru</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={kirim} noValidate>
          <DialogHeader>
            <DialogTitle>Instrumen baru</DialogTitle>
            <DialogDescription>
              Satu instrumen untuk satu jenjang. Setelah dibuat, unggah Template LED, Matriks Penilaian, dan Pedoman Penilaian jenjang ini.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="my-4">
            <Field>
              <FieldLabel htmlFor="ins-jenjang">Jenjang</FieldLabel>
              <Select value={jenjang} onValueChange={pilihJenjang}>
                <SelectTrigger id="ins-jenjang" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JENJANG.map((j) => <SelectItem key={j.kode} value={j.kode}>{j.nama} ({j.kode})</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ins-nama">Nama</FieldLabel>
              <Input id="ins-nama" value={nama} onChange={(e) => setNama(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ins-kode">Kode</FieldLabel>
              <Input id="ins-kode" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} className="font-mono" />
              <FieldDescription>Huruf kapital, angka, titik, atau tanda hubung. Harus unik.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="ins-peraturan">Peraturan acuan (opsional)</FieldLabel>
              <Textarea id="ins-peraturan" rows={2} value={peraturan} onChange={(e) => setPeraturan(e.target.value)} placeholder="Satu peraturan per baris" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={sibuk}><IkonSibuk sibuk={sibuk} />Buat instrumen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
