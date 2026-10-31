import { petaTS } from "@/modules/bersama/domain/tahun-akademik";
import { cn } from "@/modules/bersama/utils";

/** Peta label TS di LKPS ke tahun akademik nyata (TS sampai TS-7). */
export function PetaTS({ tsTahunMulai, className }: { tsTahunMulai: number; className?: string }) {
  const peta = Object.entries(petaTS(tsTahunMulai));
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4", className)}>
      {peta.map(([label, tahun]) => (
        <div key={label} className="flex items-baseline justify-between gap-2 rounded-md bg-muted/60 px-2 py-1">
          <dt className="font-mono text-xs text-muted-foreground">{label}</dt>
          <dd className="tabular-nums">{tahun}</dd>
        </div>
      ))}
    </dl>
  );
}
