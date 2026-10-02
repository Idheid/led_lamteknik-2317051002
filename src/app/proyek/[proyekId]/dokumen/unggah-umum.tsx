"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnggahBerkas } from "@/components/unggah-berkas";

export const TERIMA_DOKUMEN = ".pdf,.docx,.png,.jpg,.jpeg,.gif";

export function UnggahDokumenUmum({ proyekId, pilihan }: { proyekId: string; pilihan: { kode: string; label: string }[] }) {
  const [sub, setSub] = useState("umum");
  const [tautan, setTautan] = useState("");
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="dok-sub">Kaitkan ke sub-bagian</FieldLabel>
        <Select value={sub} onValueChange={setSub}>
          <SelectTrigger id="dok-sub" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="umum">Umum (dipakai semua sub-bagian)</SelectItem>
            {pilihan.map((s) => <SelectItem key={s.kode} value={s.kode}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="dok-tautan">Tautan bukti sahih (opsional)</FieldLabel>
        <Input id="dok-tautan" placeholder="https://drive…" value={tautan} onChange={(e) => setTautan(e.target.value)} />
        <FieldDescription>Tautan penyimpanan awan untuk lampiran LED.</FieldDescription>
      </Field>
      <UnggahBerkas
        url={`/api/proyek/${proyekId}/dokumen`}
        accept={TERIMA_DOKUMEN}
        multiple
        label="Pilih dokumen"
        keterangan="PDF, DOCX, PNG, JPG, GIF · maksimal 25 MB per berkas, 10 berkas sekaligus"
        isian={{ subBagianKode: sub === "umum" ? null : sub, tautanBukti: tautan }}
        onSelesai={() => setTautan("")}
      />
    </div>
  );
}
