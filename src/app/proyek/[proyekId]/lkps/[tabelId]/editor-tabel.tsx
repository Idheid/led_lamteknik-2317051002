"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import type { BarisLkps, KolomLkps, NilaiSel } from "@/lib/lkps/jenis";
import { aksiSimpanKoreksi } from "@/app/proyek/aksi";
import { cn } from "@/lib/utils";

/** Tabel LKPS yang bisa dikoreksi manual (terutama hasil baca PDF, F-09). */
export function EditorTabel({
  proyekId, tabelId, kolom, kolomRumus, baris: awal, perluDicek,
}: { proyekId: string; tabelId: string; kolom: KolomLkps[]; kolomRumus: string[]; baris: BarisLkps[]; perluDicek: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const [baris, setBaris] = useState(awal);
  const [ubah, setUbah] = useState(false);
  const [dicek, setDicek] = useState(!perluDicek);
  const rumus = useMemo(() => new Set(kolomRumus), [kolomRumus]);

  useEffect(() => {
    if (!ubah) return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [ubah]);

  const isi = (i: number, k: string, v: string) => {
    setBaris((b) => b.map((r, j) => (j === i ? { ...r, sel: { ...r.sel, [k]: v === "" ? null : v } } : r)));
    setUbah(true);
  };
  const tampil = (v: NilaiSel) => (v === null ? "" : String(v));

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 px-0 py-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {kolom.map((k) => (
                  <th key={k.kunci} className="max-w-48 px-2 py-2 text-left align-bottom font-medium" title={k.label}>
                    <div className="font-mono text-[11px] text-muted-foreground">{k.kunci}{k.nomor && ` · ${k.nomor}`}</div>
                    <div className="line-clamp-3 text-xs">{k.label.split(" / ").slice(-2).join(" / ")}</div>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {baris.map((r, i) => (
                <tr key={`${r.nomorBaris}-${i}`} className="border-b last:border-0">
                  {kolom.map((k) => (
                    <td key={k.kunci} className="p-1">
                      <input
                        value={tampil(r.sel[k.kunci] ?? null)}
                        onChange={(e) => isi(i, k.kunci, e.target.value)}
                        readOnly={rumus.has(k.kunci)}
                        title={rumus.has(k.kunci) ? "Dihitung rumus Excel" : undefined}
                        aria-label={`${k.label} baris ${i + 1}`}
                        className={cn(
                          "h-8 w-full min-w-20 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none hover:border-input focus:border-ring",
                          rumus.has(k.kunci) && "text-muted-foreground",
                        )}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Button
                      variant="ghost" size="icon-sm" aria-label={`Hapus baris ${i + 1}`}
                      onClick={() => { setBaris((b) => b.filter((_, j) => j !== i)); setUbah(true); }}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4">
          <Button
            variant="outline" size="sm"
            onClick={() => {
              setBaris((b) => [...b, { nomorBaris: Math.max(0, ...b.map((x) => x.nomorBaris)) + 1, sel: Object.fromEntries(kolom.map((k) => [k.kunci, null])) }]);
              setUbah(true);
            }}
          >
            <Plus aria-hidden />
            Tambah baris
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={dicek} onCheckedChange={(b) => { setDicek(b === true); setUbah(true); }} />
            Sudah saya cek dengan LKPS asli
          </label>
          <Button
            className="ml-auto"
            disabled={sibuk || !ubah}
            onClick={() => jalankan(() => aksiSimpanKoreksi(proyekId, tabelId, baris, dicek), {
              sukses: "Tabel disimpan. Metrik dihitung ulang.",
              lalu: () => setUbah(false),
            })}
          >
            <IkonSibuk sibuk={sibuk} />
            {!sibuk && <Save aria-hidden />}
            Simpan koreksi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
