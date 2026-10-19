"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { simpanSemuaTertunda } from "@/lib/simpan-tertunda";
import { cn } from "@/lib/utils";

/**
 * Tautan pindah halaman yang lebih dulu menyimpan jawaban dan suntingan yang masih tertunda
 * (tombol Sebelumnya/Berikutnya dan daftar sub-bagian). Bila penyimpanan gagal, halaman tidak berpindah.
 */
export function TautanSimpan({
  href, children, className, "aria-current": ariaCurrent, "aria-label": ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  "aria-current"?: "page";
  "aria-label"?: string;
}) {
  const router = useRouter();
  const [menyimpan, setMenyimpan] = useState(false);
  const [pindah, mulai] = useTransition();
  const sibuk = menyimpan || pindah;
  return (
    <a
      href={href}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      aria-busy={sibuk || undefined}
      className={cn(className, sibuk && "pointer-events-none opacity-70")}
      onClick={async (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        setMenyimpan(true);
        const ok = await simpanSemuaTertunda();
        setMenyimpan(false);
        if (!ok) {
          toast.error("Perubahan belum tersimpan. Periksa pesan di kolom isian, lalu coba lagi.");
          return;
        }
        mulai(() => router.push(href));
      }}
    >
      {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </a>
  );
}
