"use client";

import { useState } from "react";
import { MoreHorizontal, PlugZap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiHapusKunci, aksiTambahKunci, aksiUjiKunci } from "@/app/proyek/aksi";

export function FormKunci({ proyekId }: { proyekId: string }) {
  const { sibuk, jalankan } = useAksi();
  const [label, setLabel] = useState("Kunci utama");
  const [kunci, setKunci] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiTambahKunci(proyekId, label, kunci), {
          lalu: (diantre) => {
            setKunci("");
            toast.success(diantre ? `Kunci disimpan. ${diantre} dokumen yang tertahan diproses ulang.` : "Kunci disimpan.");
          },
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="kunci-label">Label</FieldLabel>
          <Input id="kunci-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="kunci-isi">Kunci API</FieldLabel>
          <Input id="kunci-isi" type="password" autoComplete="off" value={kunci} onChange={(e) => setKunci(e.target.value)} placeholder="AIza…" />
          <FieldDescription>Kunci tidak bisa dilihat lagi setelah disimpan.</FieldDescription>
        </Field>
        <Button type="submit" disabled={sibuk || kunci.trim().length < 20} className="w-fit">
          <IkonSibuk sibuk={sibuk} />
          Simpan kunci
        </Button>
      </FieldGroup>
    </form>
  );
}

export function AksiKunci({ proyekId, id, label }: { proyekId: string; id: string; label: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Aksi untuk ${label}`}>
          {sibuk ? <IkonSibuk sibuk /> : <MoreHorizontal aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => jalankan(() => aksiUjiKunci(proyekId, id), {
            lalu: (h) => (h.ok ? toast.success(h.pesan) : toast.error(h.pesan)),
          })}
        >
          <PlugZap aria-hidden />
          Uji koneksi
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <TombolKonfirmasi
          pemicu={
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 aria-hidden />
              Hapus
            </DropdownMenuItem>
          }
          judul={`Hapus kunci "${label}"?`}
          deskripsi="Kunci dihapus permanen dari sistem. Dokumen yang sudah diindeks tidak terpengaruh."
          onKonfirmasi={() => jalankan(() => aksiHapusKunci(proyekId, id), { sukses: "Kunci dihapus." })}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
