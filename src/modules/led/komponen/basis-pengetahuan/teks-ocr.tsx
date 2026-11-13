"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IkonSibuk } from "@/components/aksi-klien";
import { aksiSimpanKoreksiOcr, aksiTeksOcr } from "@/app/led/(tim-prodi)/aksi";

interface HalamanOcr {
  halaman: number;
  teks: string;
  keyakinan: number | null;
  perluDicek: boolean;
  dikoreksi: boolean;
}

/**
 * Rencana 10 Nov T3: lihat dan koreksi teks hasil OCR per halaman. Halaman berkeyakinan < 70% ditandai "perlu dicek".
 * Menyimpan koreksi memproses ulang dokumen tanpa OCR ulang untuk halaman yang dikoreksi.
 */
export function TeksOcr({ dokumenId, nama, jumlah, perluDicek, bolehUbah }: {
  dokumenId: string; nama: string; jumlah: number; perluDicek: number; bolehUbah: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [halaman, setHalaman] = useState<HalamanOcr[]>([]);
  const [ubah, setUbah] = useState<Record<number, string>>({});
  const [sibuk, mulai] = useTransition();

  const muat = () => mulai(async () => {
    const r = await aksiTeksOcr(dokumenId);
    if (!r.ok) return void toast.error(r.pesan);
    setHalaman(r.data.halaman);
    setUbah({});
    setBuka(true);
  });
  const simpan = () => mulai(async () => {
    const koreksi = Object.entries(ubah).map(([h, teks]) => ({ halaman: Number(h), teks }));
    const r = await aksiSimpanKoreksiOcr(dokumenId, koreksi);
    if (!r.ok) return void toast.error(r.pesan);
    toast.success("Koreksi disimpan. Dokumen diproses ulang.");
    setBuka(false);
    router.refresh();
  });

  return (
    <>
      <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={muat} disabled={sibuk}>
        {sibuk ? <IkonSibuk sibuk /> : <ScanText aria-hidden />}
        Lihat teks hasil OCR ({jumlah} hlm{perluDicek ? `, ${perluDicek} perlu dicek` : ""})
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">Teks hasil OCR: {nama}</DialogTitle>
            <DialogDescription>
              Halaman ini berupa gambar pindaian dan dibaca dengan OCR lokal (tanpa AI). Periksa terutama halaman bertanda
              perlu dicek (keyakinan &lt; 70%); teks yang salah membuat bukti sulit ditemukan.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {halaman.map((h) => (
              <li key={h.halaman} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Halaman {h.halaman}</span>
                  {h.dikoreksi
                    ? <Badge variant="secondary">dikoreksi</Badge>
                    : <span>keyakinan {h.keyakinan ?? 0}%</span>}
                  {h.perluDicek && <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">perlu dicek</Badge>}
                </div>
                <Textarea
                  rows={6}
                  value={ubah[h.halaman] ?? h.teks}
                  readOnly={!bolehUbah}
                  aria-label={`Teks halaman ${h.halaman}`}
                  onChange={(e) => setUbah({ ...ubah, [h.halaman]: e.target.value })}
                />
              </li>
            ))}
          </ol>
          {bolehUbah && (
            <DialogFooter>
              <Button onClick={simpan} disabled={sibuk || Object.keys(ubah).length === 0}>
                <IkonSibuk sibuk={sibuk} />Simpan koreksi dan proses ulang
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
