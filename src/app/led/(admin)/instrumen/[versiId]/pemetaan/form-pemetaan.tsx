"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { LABEL_PERAN, pratinjauPemetaan, type BarisGaya } from "@/modules/led/domain/pemetaan-template";
import { PERAN_GAYA, type ParagrafTemplate, type PemetaanTemplate, type PeranGaya } from "@/modules/led/domain/template-led";
import { aksiSimpanPemetaan } from "../../aksi";

const BIASA = "-";

interface Props {
  versiId: string;
  jenjang: string | null;
  terkunci: boolean;
  paragraf: ParagrafTemplate[];
  gaya: BarisGaya[];
  usulan: PemetaanTemplate;
  tersimpan: PemetaanTemplate | null;
  kriteriaMatriks: number | null;
  /** I4: usulan AI yang belum disimpan (mengisi tabel dan ditandai "usulan AI") */
  usulanAi?: { gaya: Record<string, PeranGaya>; alasan: Record<string, string> } | null;
}

/** Tabel peran gaya paragraf dan pratinjau struktur hasil pemetaan (I3). */
export function FormPemetaan({ versiId, jenjang, terkunci, paragraf, gaya, usulan, tersimpan, kriteriaMatriks, usulanAi }: Props) {
  const awal = tersimpan ?? usulan;
  // usulan AI menimpa isian awal hanya untuk gaya yang dinilainya (termasuk "seperti biasa")
  const denganAi = { ...awal.gaya };
  for (const g of Object.keys(usulanAi?.alasan ?? {})) {
    if (usulanAi!.gaya[g]) denganAi[g] = usulanAi!.gaya[g];
    else delete denganAi[g];
  }
  const dariAi = Object.keys(usulanAi?.alasan ?? {}).filter((g) => denganAi[g] !== awal.gaya[g]);
  const [peran, setPeran] = useState<Record<string, PeranGaya>>(denganAi);
  const [polaCatatan, setPolaCatatan] = useState(awal.polaCatatan ?? "");
  const [kotak, setKotak] = useState<"bawaan" | "tabel">(awal.kotak ?? "bawaan");
  const [diubah, setDiubah] = useState<Set<string>>(new Set());
  const { sibuk, jalankan } = useAksi();

  const pemetaan = useMemo<PemetaanTemplate>(() => ({ gaya: peran, polaCatatan: polaCatatan.trim() || null, kotak }), [peran, polaCatatan, kotak]);
  const pratinjau = useMemo(() => {
    try {
      return pratinjauPemetaan(paragraf, pemetaan, { jenjang, kriteriaMatriks: kriteriaMatriks ?? undefined });
    } catch {
      return null; // pola catatan belum sah
    }
  }, [paragraf, pemetaan, jenjang, kriteriaMatriks]);

  function ubah(g: string, v: string) {
    setPeran((x) => {
      const baru = { ...x };
      if (v === BIASA) delete baru[g];
      else baru[g] = v as PeranGaya;
      return baru;
    });
    setDiubah((d) => new Set(d).add(g));
  }

  function asal(g: string): string | null {
    if (diubah.has(g)) return null;
    if (dariAi.includes(g)) return "usulan AI";
    if (!tersimpan && usulan.gaya[g]) return "usulan awal";
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gaya paragraf di template</CardTitle>
          <CardDescription>
            Gaya yang dibiarkan &quot;Seperti biasa&quot; dibaca dengan aturan bawaan: paragraf bernomor menjadi judul sub-bagian, &quot;Bagian ini …&quot; menjadi instruksi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Gaya</TableHead>
                <TableHead className="text-right">Paragraf</TableHead>
                <TableHead className="hidden lg:table-cell">Nomor</TableHead>
                <TableHead>Contoh teks</TableHead>
                <TableHead className="w-60 pr-6">Peran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gaya.map((g) => (
                <TableRow key={g.gaya}>
                  <TableCell className="pl-6 align-top font-mono text-xs">{g.gaya || "(tanpa gaya)"}</TableCell>
                  <TableCell className="text-right align-top tabular-nums">{g.jumlah}</TableCell>
                  <TableCell className="hidden align-top text-xs text-muted-foreground lg:table-cell">
                    {g.bernomor ? `${g.bernomor} bernomor${g.ilvl.length ? ` · tingkat ${g.ilvl.join(", ")}` : ""}` : "tidak"}
                  </TableCell>
                  <TableCell className="max-w-64 align-top text-xs whitespace-normal">
                    <ul className="flex flex-col gap-0.5">{g.contoh.map((c) => <li key={c} className="break-words">{c}</li>)}</ul>
                  </TableCell>
                  <TableCell className="pr-6 align-top">
                    <Select value={peran[g.gaya] ?? BIASA} onValueChange={(v) => ubah(g.gaya, v)} disabled={terkunci}>
                      <SelectTrigger className="w-full" aria-label={`Peran gaya ${g.gaya || "tanpa gaya"}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BIASA}>{LABEL_PERAN[""]}</SelectItem>
                        {PERAN_GAYA.map((x) => <SelectItem key={x} value={x}>{LABEL_PERAN[x]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {asal(g.gaya) && <Badge variant="outline" className="mt-1">{asal(g.gaya)}</Badge>}
                    {asal(g.gaya) === "usulan AI" && usulanAi?.alasan[g.gaya] && (
                      <p className="mt-1 text-xs text-muted-foreground">{usulanAi.alasan[g.gaya]}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="grid gap-4 px-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="pola-catatan">Pola catatan jenjang (opsional)</FieldLabel>
              <Input id="pola-catatan" className="font-mono text-xs" value={polaCatatan} onChange={(e) => setPolaCatatan(e.target.value)}
                placeholder="disampaikan oleh pengusul" disabled={terkunci} />
              <FieldDescription>Kosongkan untuk pola bawaan: &quot;(… disampaikan oleh pengusul … pada program …)&quot;.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="pola-kotak">Kotak isian</FieldLabel>
              <Select value={kotak} onValueChange={(v) => setKotak(v as "bawaan" | "tabel")} disabled={terkunci}>
                <SelectTrigger id="pola-kotak" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bawaan">Bawaan: kotak teks di bawah instruksi</SelectItem>
                  <SelectItem value="tabel">Setiap tabel adalah kotak isian</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pratinjau struktur</CardTitle>
            <CardDescription>
              {pratinjau ? `${pratinjau.jumlahKriteria} kriteria${kriteriaMatriks ? ` (Matriks: ${kriteriaMatriks})` : ""}` : "Pola catatan belum sah."}
              {jenjang && pratinjau ? ` · ${pratinjau.total[jenjang]} sub-bagian ${namaJenjang(jenjang)}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {pratinjau?.peringatan.map((x) => (
              <p key={x} className="flex items-start gap-2 text-amber-800 dark:text-amber-200"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{x}</p>
            ))}
            <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
              {pratinjau?.bagian.map((b) => (
                <li key={b.kode}>
                  <details>
                    <summary className="cursor-pointer">
                      <span className="font-mono text-xs">{b.kode}</span> {b.nama}
                      <span className="ml-1 text-xs text-muted-foreground tabular-nums">({jenjang ? b.sub[jenjang] : b.judul.length})</span>
                    </summary>
                    <ul className="ml-4 list-disc text-xs text-muted-foreground">{b.judul.map((j, i) => <li key={`${i}-${j}`}>{j}</li>)}</ul>
                  </details>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          {!terkunci && (
            <Button
              disabled={sibuk || !pratinjau}
              onClick={() => jalankan(() => aksiSimpanPemetaan(versiId, pemetaan), {
                lalu: (r) => {
                  if (r.masalah) toast.warning(`Pemetaan disimpan, tetapi: ${r.masalah}`);
                  else if (r.diagnosis === "cocok") toast.success("Pemetaan disimpan. Template terbaca; lanjutkan ekstraksi di halaman versi.");
                  else toast.warning("Pemetaan disimpan, tetapi kriteria belum terbaca.");
                  setDiubah(new Set());
                },
              })}
            >
              <IkonSibuk sibuk={sibuk} /><Save aria-hidden />Simpan pemetaan
            </Button>
          )}
          <Button asChild variant="outline"><Link href={`/led/instrumen/${versiId}`}><ArrowLeft aria-hidden />Kembali ke versi</Link></Button>
        </div>
      </div>
    </div>
  );
}
