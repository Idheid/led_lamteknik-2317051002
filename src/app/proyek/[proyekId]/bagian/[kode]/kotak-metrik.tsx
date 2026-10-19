import { formatMetrik } from "@/lib/tampil";
import { formatAngka } from "@/lib/domain/teks";
import type { HasilButirAngka } from "@/lib/domain/metrik-lkps";

/** Data LKPS butir angka yang dihitung sistem. */
export function KotakMetrik({ hasil, perluDicek, proyekId }: { hasil: HasilButirAngka | undefined; perluDicek: boolean; proyekId: string }) {
  if (!hasil) {
    return (
      <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
        Metrik butir ini dihitung sistem dari LKPS.{" "}
        <a className="text-primary underline" href={`/proyek/${proyekId}/lkps`}>Unggah LKPS</a> untuk melihat nilainya.
      </p>
    );
  }
  return (
    <div className="rounded-md bg-muted/60 p-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Data LKPS (dihitung sistem){perluDicek ? " · dari PDF, perlu dicek" : ""}</span>
        {hasil.skor !== null && <span className="normal-case">skor perkiraan {formatAngka(hasil.skor, 2)}</span>}
      </div>
      <dl className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {hasil.metrik.map((m) => (
          <div key={m.kode} className="flex justify-between gap-2">
            <dt className={m.kode === hasil.utama ? "font-medium" : "text-muted-foreground"}>{m.nama}</dt>
            <dd className="shrink-0 tabular-nums">{formatMetrik(m)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
