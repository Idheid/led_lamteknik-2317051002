"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import type { Peran } from "@/modules/bersama/peran";
import { aksiUbahNamaAkun, aksiUbahPeranAkun } from "../../aksi";
import { PERAN_BARU, type PilihanProdi } from "../komponen";

/** Ubah nama akun (perbaikan 1 Nov 2026, P1). */
export function FormUbahNama({ id, awal }: { id: string; awal: string }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [nama, setNama] = useState(awal);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiUbahNamaAkun(id, nama), { sukses: "Nama akun diperbarui.", lalu: () => router.push("/admin/akun") });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ubah-nama">Nama</FieldLabel>
          <Input id="ubah-nama" value={nama} onChange={(e) => setNama(e.target.value)} />
        </Field>
        <Button type="submit" className="w-fit" disabled={sibuk || !nama.trim() || nama.trim() === awal}>
          <IkonSibuk sibuk={sibuk} />Simpan nama
        </Button>
      </FieldGroup>
    </form>
  );
}

/** Ubah peran akun (perbaikan 1 Nov 2026, P1): pilihan peran sama dengan Tambah akun; Tim Prodi wajib memilih prodi. */
export function FormUbahPeran({ id, peranAwal, prodiAwal, prodi }: { id: string; peranAwal: Peran; prodiAwal: string | null; prodi: PilihanProdi[] }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [peran, setPeran] = useState<Peran>(peranAwal);
  const [prodiId, setProdiId] = useState(prodiAwal ?? "");
  const kurangProdi = peran === "TIM_PRODI" && !prodiId;
  const tidakBerubah = peran === peranAwal && (peran !== "TIM_PRODI" || prodiId === (prodiAwal ?? ""));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiUbahPeranAkun(id, { peran, prodiId: peran === "TIM_PRODI" ? prodiId : null }), {
          sukses: "Peran akun diperbarui. Pemilik akun perlu login ulang.",
          lalu: () => router.push("/admin/akun"),
        });
      }}
    >
      <FieldGroup>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Peran</legend>
          {PERAN_BARU.map((x) => (
            <label
              key={x.kunci}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${peran === x.kunci ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <input type="radio" name="peran" value={x.kunci} checked={peran === x.kunci} onChange={() => setPeran(x.kunci)} className="mt-1 accent-[var(--primary)]" />
              <span>
                <span className="block font-medium">{x.judul}</span>
                <span className="block text-muted-foreground">{x.isi}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {peran === "TIM_PRODI" && (
          <Field data-invalid={kurangProdi}>
            <FieldLabel htmlFor="ubah-prodi">Program studi</FieldLabel>
            <Select value={prodiId} onValueChange={setProdiId}>
              <SelectTrigger id="ubah-prodi" className="w-full"><SelectValue placeholder="Pilih program studi" /></SelectTrigger>
              <SelectContent>
                {prodi.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {kurangProdi && <FieldError>Pilih program studi.</FieldError>}
          </Field>
        )}
        {peranAwal === "TIM_PRODI" && peran !== "TIM_PRODI" && (
          <FieldDescription>Akun ini tidak lagi terikat ke program studi.</FieldDescription>
        )}
        <Button type="submit" className="w-fit" disabled={sibuk || kurangProdi || tidakBerubah}>
          <IkonSibuk sibuk={sibuk} />Simpan peran
        </Button>
      </FieldGroup>
    </form>
  );
}
