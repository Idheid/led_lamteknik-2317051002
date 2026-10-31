import Link from "next/link";
import { ArrowRight, MessageCircle, Wrench } from "lucide-react";
import type { PerbaikanMenunggu } from "@/modules/led/data/review";
import { Pil } from "@/modules/led/komponen/kesiapan";

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/**
 * Kotak "Perbaikan dari PJ" di Ringkasan review asesor (revisi 26 Okt 2026): setiap catatan yang sudah diperbaiki PJ
 * tampil sebagai kartu (sub-bagian, teks yang diblok, catatan asesor, pesan PJ) dengan tombol Periksa yang membuka
 * sub-bagian tepat di catatannya.
 */
export function KotakPerbaikan({ daftar }: { daftar: PerbaikanMenunggu[] }) {
  if (!daftar.length) return null;
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-5 shadow-xs" aria-label="Perbaikan dari PJ">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-base font-semibold">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Wrench className="size-4.5" aria-hidden /></span>
          <span>
            Perbaikan dari PJ
            <span className="block text-sm font-normal text-muted-foreground">Periksa perbaikannya, lalu Terima atau Buka lagi.</span>
          </span>
        </h2>
        <Pil warna="biru">{daftar.length} perlu diperiksa</Pil>
      </div>
      <ul className="flex flex-col gap-2">
        {daftar.map((x) => (
          <li key={x.id}>
            <Link
              href={x.href}
              className="group flex flex-col gap-3 rounded-xl border p-4 transition hover:border-primary hover:bg-primary/5 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono text-xs text-muted-foreground">{x.bagianKode}{x.label ? ` ${x.label}` : ""}</span>
                  <span className="font-medium">{x.judul}</span>
                  <span className="text-xs text-muted-foreground">· diperbaiki {fmt.format(new Date(x.waktu))}</span>
                </div>
                <blockquote className="line-clamp-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">{x.teks}</blockquote>
                <p className="line-clamp-1 text-sm"><span className="text-muted-foreground">Catatan Anda: </span>{x.isi}</p>
                {x.pesanPj && (
                  <p className="flex items-start gap-1.5 text-sm text-primary">
                    <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /><span className="line-clamp-2">PJ: {x.pesanPj}</span>
                  </p>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:self-center">
                Periksa<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
