"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { JENJANG, type KodeJenjang } from "@/lib/domain/instrumen";

export function PilihJenjang({
  nilai, onUbah, idAwal, nonaktif,
}: { nilai: KodeJenjang[]; onUbah: (v: KodeJenjang[]) => void; idAwal: string; nonaktif?: boolean }) {
  const semua = nilai.length === JENJANG.length;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={semua}
          disabled={nonaktif}
          onCheckedChange={(b) => onUbah(b ? JENJANG.map((j) => j.kode) : [])}
        />
        Semua jenjang
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {JENJANG.map((j) => {
          const id = `${idAwal}-${j.kode}`;
          return (
            <label key={j.kode} htmlFor={id} className="flex items-center gap-1.5 text-sm" title={j.nama}>
              <Checkbox
                id={id}
                checked={nilai.includes(j.kode)}
                disabled={nonaktif}
                onCheckedChange={(b) =>
                  onUbah(b ? JENJANG.map((x) => x.kode).filter((k) => k === j.kode || nilai.includes(k)) : nilai.filter((k) => k !== j.kode))
                }
              />
              {j.kode}
            </label>
          );
        })}
      </div>
    </div>
  );
}
