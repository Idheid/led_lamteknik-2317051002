"use client";

import { Checkbox } from "@/components/ui/checkbox";

export interface BahanSalin {
  jumlahTim: number;
  jumlahBahan: number;
  dokumen: { id: string; nama: string; tahunTerbit: number | null; dicentang: boolean }[];
}

export interface PilihanSalin {
  tim: boolean;
  bahan: boolean;
  dokumen: string[];
  narasiLalu: boolean;
}

export function pilihanAwal(b: BahanSalin): PilihanSalin {
  return { tim: b.jumlahTim > 0, bahan: b.jumlahBahan > 0, dokumen: b.dokumen.filter((d) => d.dicentang).map((d) => d.id), narasiLalu: false };
}

function Baris({ id, centang, onUbah, judul, ket, nonaktif }: { id: string; centang: boolean; onUbah: (c: boolean) => void; judul: string; ket?: string; nonaktif?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={centang} disabled={nonaktif} onCheckedChange={(c) => onUbah(c === true)} className="mt-0.5" />
      <label htmlFor={id} className="text-sm leading-snug">
        {judul}
        {ket && <span className="block text-xs text-muted-foreground">{ket}</span>}
      </label>
    </div>
  );
}

/**
 * Bahan dari LED lama yang disalin ke LED periode berikutnya (L5, 2 Nov 2026). Semua tercentang kecuali dokumen lebih
 * tua dari 5 tahun dan narasi lama sebagai sumber P. Narasi lama tidak disalin ke narasi baru; data LKPS tidak disalin.
 */
export function PilihanBahan({ bahan, nilai, onUbah }: { bahan: BahanSalin; nilai: PilihanSalin; onUbah: (v: PilihanSalin) => void }) {
  const ubahDokumen = (id: string, c: boolean) =>
    onUbah({ ...nilai, dokumen: c ? [...new Set([...nilai.dokumen, id])] : nilai.dokumen.filter((x) => x !== id) });
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Bahan yang disalin dari LED lama</legend>
      <Baris id="salin-tim" centang={nilai.tim} onUbah={(c) => onUbah({ ...nilai, tim: c })} nonaktif={!bahan.jumlahTim}
        judul={`Tim penyusun (${bahan.jumlahTim} orang)`} ket="Disalin lalu ditandai periksa ulang." />
      <Baris id="salin-bahan" centang={nilai.bahan} onUbah={(c) => onUbah({ ...nilai, bahan: c })} nonaktif={!bahan.jumlahBahan}
        judul={`Bahan dari prodi (${bahan.jumlahBahan} sub-bagian)`}
        ket={'Diberi awalan "[dari LED tahun]" supaya diperbarui. Bila instrumen berganti, dicocokkan lewat judul sub-bagian; sisanya tampil sebagai "Bahan lama yang belum dipindah".'} />
      {bahan.dokumen.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Dokumen prodi di Basis Pengetahuan ({nilai.dokumen.length}/{bahan.dokumen.length} dipilih)</p>
          <p className="text-xs text-muted-foreground">Berkas disalin lalu diproses ulang. Dokumen lebih tua dari 5 tahun tidak dicentang.</p>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pl-2">
            {bahan.dokumen.map((d) => (
              <Baris key={d.id} id={`salin-dok-${d.id}`} centang={nilai.dokumen.includes(d.id)} onUbah={(c) => ubahDokumen(d.id, c)}
                judul={d.nama} ket={d.tahunTerbit ? `terbit ${d.tahunTerbit}` : "tahun terbit kosong"} />
            ))}
          </div>
        </div>
      )}
      <Baris id="salin-narasi" centang={nilai.narasiLalu} onUbah={(c) => onUbah({ ...nilai, narasiLalu: c })}
        judul="Pakai narasi LED lama sebagai pembanding (sumber P)"
        ket="Hanya untuk analisis faktor (evaluasi capaian) dan strategi perbaikan. Narasi lama tidak disalin; selalu bisa dibaca di panel Narasi LED periode lalu." />
      <p className="text-xs text-muted-foreground">Data LKPS tidak disalin karena TS-nya berbeda; unggah LKPS baru di LED baru.</p>
    </fieldset>
  );
}
