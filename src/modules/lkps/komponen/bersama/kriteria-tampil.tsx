import {
  Award, BookOpen, FlaskConical, Handshake, HeartHandshake, Layers, ShieldCheck, UserCheck, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { cn } from "@/modules/bersama/utils";

/**
 * Ikon berwarna per kriteria LKPS (Gabung LKPS G7). Ikon dan pilihan warna dari sidebar/dashboard kode asal
 * (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff), dibuat ulang dengan kelas Tailwind (latar tipis + teks berwarna, ada varian
 * mode gelap) supaya serasi dengan komponen LED dan kontrasnya cukup.
 */
const WARNA = {
  biru: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  sian: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  ungu: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  hijau: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  kuning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  merahMuda: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  jingga: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  toska: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  nila: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
} as const;

export interface TampilKriteria {
  ikon: LucideIcon;
  warna: string;
}

const KRITERIA: Record<number, TampilKriteria> = {
  1: { ikon: Handshake, warna: WARNA.biru },
  2: { ikon: Users, warna: WARNA.sian },
  3: { ikon: UserCheck, warna: WARNA.ungu },
  4: { ikon: Wallet, warna: WARNA.hijau },
  5: { ikon: BookOpen, warna: WARNA.kuning },
  6: { ikon: FlaskConical, warna: WARNA.merahMuda },
  7: { ikon: HeartHandshake, warna: WARNA.jingga },
  8: { ikon: Award, warna: WARNA.toska },
  9: { ikon: ShieldCheck, warna: WARNA.nila },
};

/** Kriteria 1–9 memakai ikon dan warnanya; kriteria tambahan dari konfigurasi memakai ikon lapisan berwarna ungu. */
export function tampilKriteria(nomor: number): TampilKriteria {
  return KRITERIA[nomor] ?? { ikon: Layers, warna: WARNA.ungu };
}

export function IkonKriteria({ nomor, besar = "md", className }: { nomor: number; besar?: "sm" | "md" | "lg"; className?: string }) {
  const { ikon: Ikon, warna } = tampilKriteria(nomor);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        besar === "sm" ? "size-8" : besar === "lg" ? "size-12" : "size-10",
        warna,
        className,
      )}
      aria-hidden
    >
      <Ikon className={besar === "sm" ? "size-4" : besar === "lg" ? "size-6" : "size-5"} />
    </span>
  );
}

/**
 * Cincin progres 0–100% (dashboard kode asal), dibuat ulang memakai warna tema LED: lintasan `--muted`, isian
 * `--primary`, angka di tengah. Untuk pembaca layar memakai role progressbar.
 */
export function CincinProgres({ persen, label, className }: { persen: number; label: string; className?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(persen)));
  const r = 22;
  const keliling = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 56 56"
      className={cn("size-14 shrink-0", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={label}
    >
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
      <circle
        cx="28" cy="28" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
        className={cn("transition-[stroke-dashoffset] duration-500", p >= 100 ? "stroke-emerald-600" : "stroke-primary")}
        strokeDasharray={keliling}
        strokeDashoffset={keliling - (p / 100) * keliling}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" className="fill-foreground text-[11px] font-semibold tabular-nums">{p}%</text>
    </svg>
  );
}
