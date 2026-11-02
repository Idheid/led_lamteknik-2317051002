"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/modules/bersama/utils";

const PERISTIWA = "petunjuk-berubah";

function langgan(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(PERISTIWA, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(PERISTIWA, cb);
  };
}

/**
 * Petunjuk singkat di setiap halaman: fungsi halaman dan langkah berikutnya.
 * Terbuka secara bawaan; bila ditutup, pilihan diingat per halaman di browser (localStorage).
 */
export function Petunjuk({ kunci, fungsi, langkah }: { kunci: string; fungsi: ReactNode; langkah: ReactNode[] }) {
  const id = `petunjuk:${kunci}`;
  const tersimpan = useSyncExternalStore(
    langgan,
    () => {
      try {
        return localStorage.getItem(id);
      } catch {
        return null; // penyimpanan browser tidak tersedia: tetap terbuka
      }
    },
    () => null,
  );
  const [lokal, setLokal] = useState<string | null>(null);
  const buka = (lokal ?? tersimpan) !== "tutup";
  const ubah = () => {
    const baru = buka ? "tutup" : "buka";
    setLokal(baru);
    try {
      localStorage.setItem(id, baru);
      window.dispatchEvent(new Event(PERISTIWA));
    } catch {
      // abaikan: pilihan hanya berlaku sampai halaman dimuat ulang
    }
  };
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 text-sm">
      <button
        type="button"
        onClick={ubah}
        aria-expanded={buka}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-medium text-primary"
      >
        <Lightbulb className="size-4 shrink-0" aria-hidden />
        Petunjuk halaman ini
        <ChevronDown className={cn("ml-auto size-4 transition-transform", buka && "rotate-180")} aria-hidden />
      </button>
      {buka && (
        <div className="space-y-2 px-4 pb-3 text-foreground/90">
          <p>{fungsi}</p>
          {langkah.length > 0 && (
            <ol className="list-decimal space-y-0.5 pl-5 text-muted-foreground">
              {langkah.map((l, i) => <li key={i}>{l}</li>)}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
