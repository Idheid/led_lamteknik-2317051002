"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, CornerDownRight, GitCompareArrows, MessageSquareText, RotateCcw, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { cn } from "@/modules/bersama/utils";
import { LABEL_CATATAN, type AksiCatatan, type StatusCatatan } from "@/modules/led/domain/review";
import type { PotonganDiff } from "@/modules/led/domain/narasi";
import type { CatatanTampil } from "@/modules/led/data/review";
import type { SorotCatatan } from "./sorotan-catatan";
import { aksiBalasCatatan, aksiBandingkanCatatan, aksiHapusCatatan, aksiUbahStatusCatatan } from "@/app/led/aksi-review";

/**
 * Catatan revisi asesor (revisi 22 Okt 2026), dipakai di layar PJ dan asesor. Daftar diperbarui otomatis setiap
 * beberapa detik tanpa muat ulang halaman, jadi catatan baru dari asesor langsung muncul di layar PJ dan sebaliknya.
 */

const JEDA_MS = 4000;

/** Catatan satu sub-bagian yang diperbarui berkala. */
export function useCatatanLangsung(proyekId: string, subBagianKode: string, awal: CatatanTampil[], versiAwal: string | null = null) {
  const [catatan, setCatatan] = useState(awal);
  const [versiAktifId, setVersiAktifId] = useState(versiAwal);
  const muat = useCallback(async () => {
    try {
      const r = await fetch(`/api/led/proyek/${proyekId}/catatan?sub=${encodeURIComponent(subBagianKode)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { catatan: CatatanTampil[]; versiAktifId: string | null };
      setCatatan(d.catatan);
      setVersiAktifId(d.versiAktifId);
    } catch {
      // jaringan terputus sebentar: coba lagi pada putaran berikutnya
    }
  }, [proyekId, subBagianKode]);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void muat();
    }, JEDA_MS);
    return () => clearInterval(t);
  }, [muat]);
  return { catatan, muat, versiAktifId };
}

/** Catatan → sorotan editor (catatan yang diterima tetap disorot tipis supaya riwayatnya terlihat). */
export function keSorotan(catatan: CatatanTampil[], aktif: string | null): SorotCatatan[] {
  return catatan.map((c) => ({ id: c.id, teks: c.teks, sebelum: c.sebelum, sesudah: c.sesudah, status: c.status, aktif: c.id === aktif }));
}

const GAYA_STATUS: Record<StatusCatatan, string> = {
  terbuka: "border-transparent bg-primary/10 text-primary",
  diperbaiki: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  diterima: "border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const LABEL_JENIS: Record<string, string> = {
  diperbaiki: "menandai sudah diperbaiki",
  diterima: "menerima perbaikan",
  dibuka: "membuka lagi",
  balasan: "membalas",
};

function waktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function TampilanDiff({ potongan }: { potongan: PotonganDiff[] }) {
  if (potongan.every((x) => x.jenis === "sama")) return <p className="text-sm text-muted-foreground">Belum ada perubahan teks.</p>;
  return (
    <div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm leading-relaxed">
      {potongan.map((x, i) => x.jenis === "sama"
        ? <span key={i}>{x.teks}</span>
        : x.jenis === "hapus"
          ? <del key={i} className="rounded-sm bg-rose-50 text-rose-700 decoration-rose-500 dark:bg-rose-950/40 dark:text-rose-300">{x.teks}</del>
          : <ins key={i} className="rounded-sm bg-amber-100 no-underline dark:bg-amber-900/40">{x.teks}</ins>)}
    </div>
  );
}

function TombolBandingkan({ catatanId }: { catatanId: string }) {
  const [buka, setBuka] = useState(false);
  const [hasil, setHasil] = useState<{ lama: number | null; baru: number | null; potongan: PotonganDiff[] } | null>(null);
  const [sibuk, mulai] = useTransition();
  const bandingkan = () => mulai(async () => {
    const r = await aksiBandingkanCatatan(catatanId);
    if (!r.ok) {
      toast.error(r.pesan);
      return;
    }
    setHasil({ lama: r.data.lama?.nomor ?? null, baru: r.data.baru?.nomor ?? null, potongan: r.data.potongan });
    setBuka(true);
  });
  return (
    <>
      <Button size="sm" variant="outline" onClick={bandingkan} disabled={sibuk}>
        {sibuk ? <IkonSibuk sibuk /> : <GitCompareArrows aria-hidden />}Bandingkan
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sebelum dan sesudah perbaikan</DialogTitle>
            <DialogDescription>
              {hasil?.lama ? `Versi ${hasil.lama} (saat catatan dibuat) → versi ${hasil.baru} (saat ditandai diperbaiki).` : "Versi sama."}{" "}
              <del className="text-rose-700 dark:text-rose-300">Dicoret</del> = dihapus, <ins className="bg-amber-100 no-underline dark:bg-amber-900/40">disorot</ins> = ditambahkan.
            </DialogDescription>
          </DialogHeader>
          {hasil && <TampilanDiff potongan={hasil.potongan} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function KartuCatatan({ c, peran, bolehUbah, aktif, onPilih, muat }: {
  c: CatatanTampil;
  peran: "PJ" | "ASESOR";
  bolehUbah: boolean;
  aktif: boolean;
  onPilih: () => void;
  muat: () => Promise<void>;
}) {
  const { sibuk, jalankan } = useAksi();
  const [balas, setBalas] = useState("");
  const [tulis, setTulis] = useState(false);
  const selesai = () => {
    setBalas("");
    setTulis(false);
    void muat();
  };
  const ubah = (aksi: AksiCatatan, sukses: string) => jalankan(() => aksiUbahStatusCatatan(c.id, aksi, balas), { sukses, lalu: selesai });
  return (
    <li
      id={`catatan-${c.id}`}
      className={cn("scroll-mt-20 rounded-lg border p-3 text-sm transition-shadow", aktif && "ring-2 ring-primary", c.status === "diterima" && "opacity-75")}
      onClick={onPilih}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className={GAYA_STATUS[c.status]}>{LABEL_CATATAN[c.status]}</Badge>
        {!c.ditemukan && <Badge variant="outline">Teks asli sudah berubah</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{waktu(c.dibuat)}</span>
      </div>
      <blockquote className="mb-1.5 line-clamp-3 border-l-2 border-primary/40 pl-2 text-xs text-muted-foreground">{c.teks}</blockquote>
      <p className="whitespace-pre-line">{c.isi}</p>
      {c.balasan.length > 0 && (
        <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
          {c.balasan.map((b) => (
            <li key={b.id} className="flex gap-1.5">
              <CornerDownRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="font-medium">{b.penulis ?? "Akun dihapus"}</span>
                <span className="text-muted-foreground"> {b.peranPenulis === "ASESOR" ? "(asesor)" : "(Tim Prodi)"} {LABEL_JENIS[b.jenis] ?? b.jenis} · {waktu(b.waktu)}</span>
                {b.isi && <span className="block whitespace-pre-line">{b.isi}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {bolehUbah && (
        <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {peran === "PJ" && c.status === "terbuka" && (
            <Button size="sm" disabled={sibuk} onClick={() => ubah("diperbaiki", "Ditandai sudah diperbaiki; asesor diberi tahu.")}>
              <Wrench aria-hidden />Sudah diperbaiki
            </Button>
          )}
          {peran === "ASESOR" && c.status !== "terbuka" && c.versiAwalId && <TombolBandingkan catatanId={c.id} />}
          {peran === "ASESOR" && c.status === "diperbaiki" && (
            <Button size="sm" disabled={sibuk} onClick={() => ubah("diterima", "Perbaikan diterima.")}><Check aria-hidden />Terima</Button>
          )}
          {peran === "ASESOR" && c.status === "terbuka" && (
            <TombolKonfirmasi
              pemicu={<Button size="sm" variant="ghost" disabled={sibuk}><Trash2 aria-hidden />Hapus</Button>}
              judul="Hapus catatan ini?"
              deskripsi="Catatan yang masih terbuka bisa dihapus bila salah blok atau tidak jadi."
              onKonfirmasi={() => jalankan(() => aksiHapusCatatan(c.id), { sukses: "Catatan dihapus.", lalu: selesai })}
            />
          )}
          <Button size="sm" variant="ghost" onClick={() => setTulis((x) => !x)}><MessageSquareText aria-hidden />Balas</Button>
        </div>
      )}
      {bolehUbah && tulis && (
        <div className="mt-2 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Textarea value={balas} onChange={(e) => setBalas(e.target.value)} rows={2} placeholder={peran === "ASESOR" ? "Balasan atau yang masih perlu diperbaiki" : "Balasan untuk asesor"} aria-label="Balasan" />
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" disabled={sibuk || !balas.trim()} onClick={() => jalankan(() => aksiBalasCatatan(c.id, balas), { lalu: selesai })}>
              <IkonSibuk sibuk={sibuk} />Kirim balasan
            </Button>
            {peran === "ASESOR" && c.status !== "terbuka" && (
              <Button size="sm" variant="outline" disabled={sibuk || !balas.trim()} onClick={() => ubah("dibuka", "Catatan dibuka lagi.")}>
                <RotateCcw aria-hidden />Buka lagi
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function PanelCatatan({ catatan, peran, bolehUbah, aktif, onPilih, muat }: {
  catatan: CatatanTampil[];
  peran: "PJ" | "ASESOR";
  bolehUbah: boolean;
  aktif: string | null;
  onPilih: (id: string) => void;
  muat: () => Promise<void>;
}) {
  const [semua, setSemua] = useState(false);
  const belum = catatan.filter((c) => c.status !== "diterima").length;
  const tampil = useMemo(() => (semua ? catatan : catatan.filter((c) => c.status !== "diterima")), [catatan, semua]);
  return (
    <section className="rounded-lg border p-3" aria-label="Catatan revisi asesor" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catatan asesor</h4>
        <span className="text-xs text-muted-foreground">{belum} belum selesai · {catatan.length} total</span>
      </div>
      {catatan.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {peran === "ASESOR" ? "Blok teks di narasi untuk menulis catatan revisi." : "Belum ada catatan. Catatan asesor muncul di sini tanpa muat ulang."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tampil.map((c) => (
            <KartuCatatan key={c.id} c={c} peran={peran} bolehUbah={bolehUbah} aktif={aktif === c.id} onPilih={() => onPilih(c.id)} muat={muat} />
          ))}
        </ul>
      )}
      {catatan.length > belum && (
        <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setSemua((x) => !x)}>
          {semua ? "Sembunyikan yang sudah diterima" : `Tampilkan ${catatan.length - belum} yang sudah diterima`}
        </Button>
      )}
    </section>
  );
}
