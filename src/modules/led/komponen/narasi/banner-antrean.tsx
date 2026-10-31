"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Clock, KeyRound, Loader2, Play, X } from "lucide-react";
import type { RingkasTugas } from "@/modules/led/data/generate";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/modules/bersama/utils";
import { aksiBatalkanTugas, aksiLanjutkanTugas } from "@/app/led/(tim-prodi)/aksi";

/**
 * Pemberitahuan antrean generate di semua halaman proyek. Penyusunan berjalan di worker, jadi halaman boleh
 * ditinggal. Status dipantau berkala; halaman disegarkan setiap ada sub-bagian yang selesai.
 */
export function BannerAntrean({ proyekId, awal }: { proyekId: string; awal: RingkasTugas[] }) {
  const router = useRouter();
  const [tugas, setTugas] = useState(awal);
  const [ditutup, setDitutup] = useState<string[]>([]);
  const jejak = useRef(awal.map((t) => `${t.id}:${t.indeks}:${t.status}`).join("|"));
  const { sibuk, jalankan } = useAksi();

  // data awal dari server berubah (router.refresh): ikuti
  const [awalTerakhir, setAwalTerakhir] = useState(awal);
  if (awal !== awalTerakhir) {
    setAwalTerakhir(awal);
    setTugas(awal);
  }

  const berjalan = tugas.some((t) => t.status === "antre" || t.status === "berjalan");
  const tertunda = tugas.some((t) => t.status === "tertunda");
  useEffect(() => {
    if (!berjalan && !tertunda) return;
    let batal = false;
    const pantau = async () => {
      try {
        const r = await fetch(`/api/led/proyek/${proyekId}/generate`, { cache: "no-store" });
        if (!r.ok || batal) return;
        const { tugas: baru } = (await r.json()) as { tugas: RingkasTugas[] };
        setTugas(baru);
        const j = baru.map((t) => `${t.id}:${t.indeks}:${t.status}`).join("|");
        if (j !== jejak.current) {
          jejak.current = j;
          router.refresh();
        }
      } catch {
        // jaringan terputus sesaat: coba lagi pada putaran berikutnya
      }
    };
    const t = setInterval(pantau, berjalan ? 3000 : 15000);
    return () => {
      batal = true;
      clearInterval(t);
    };
  }, [berjalan, tertunda, proyekId, router]);

  const tampil = tugas.filter((t) => !ditutup.includes(t.id) && t.status !== "dibatalkan");
  if (tampil.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {tampil.map((t) => {
        const persen = t.total ? (t.indeks / t.total) * 100 : 0;
        const gaya = t.status === "gagal"
          ? "border-destructive/30 bg-destructive/5"
          : t.status === "tertunda"
            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            : t.status === "selesai"
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              : "border-primary/30 bg-primary/5";
        return (
          <div key={t.id} className={cn("rounded-lg border px-4 py-3 text-sm", gaya)} role="status">
            <div className="flex flex-wrap items-start gap-3">
              {t.status === "selesai" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                : t.status === "gagal" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  : t.status === "tertunda" ? <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                    : <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">
                  {t.status === "selesai" ? `Penyusunan ${t.judul} selesai`
                    : t.status === "gagal" ? `Penyusunan ${t.judul} berhenti`
                      : t.status === "tertunda" ? `Penyusunan ${t.judul} tertunda`
                        : t.status === "antre" ? `Penyusunan ${t.judul} menunggu antrean`
                          : `Menyusun ${t.judul}`}
                  <span className="ml-2 font-normal text-muted-foreground tabular-nums">{t.indeks}/{t.total} sub-bagian</span>
                </p>
                {(t.status === "berjalan" || t.status === "antre") && (
                  <p className="text-muted-foreground">
                    {t.sedang ? `Sedang: ${t.sedang}. ` : ""}Anda boleh meninggalkan halaman ini; penyusunan tetap berjalan di server.
                  </p>
                )}
                {t.pesan && t.status !== "selesai" && <p className={t.status === "gagal" ? "text-destructive" : ""}>{t.pesan}</p>}
                {t.status === "tertunda" && t.dilanjutkanPada && (
                  <p className="text-xs text-muted-foreground">
                    Dicoba lagi otomatis sekitar {new Intl.DateTimeFormat("id-ID", { timeStyle: "short", dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(t.dilanjutkanPada))} WIB.
                  </p>
                )}
                {t.status !== "selesai" && <Progress value={persen} className="mt-1 h-1.5" aria-label="Progres penyusunan" />}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {t.status === "tertunda" && /kunci/i.test(t.pesan ?? "") && (
                  <Button asChild size="sm"><Link href="/pengaturan/kunci-api"><KeyRound aria-hidden />Tambah kunci API</Link></Button>
                )}
                {t.status === "gagal" && (
                  <Button size="sm" disabled={sibuk} onClick={() => jalankan(() => aksiLanjutkanTugas(proyekId, t.id), { sukses: "Penyusunan dilanjutkan." })}>
                    {sibuk ? <IkonSibuk sibuk /> : <Play aria-hidden />}Lanjutkan
                  </Button>
                )}
                {t.status !== "selesai" && (
                  <Button size="sm" variant="outline" disabled={sibuk} onClick={() => jalankan(() => aksiBatalkanTugas(proyekId, t.id), { sukses: "Penyusunan dibatalkan. Draf yang sudah jadi tetap tersimpan." })}>
                    Batalkan
                  </Button>
                )}
                {t.status === "selesai" && (
                  <Button size="icon-sm" variant="ghost" aria-label="Tutup pemberitahuan" onClick={() => setDitutup((d) => [...d, t.id])}><X /></Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
