import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ambilTabel } from "@/lib/data/lkps";
import { petaTS } from "@/lib/domain/tahun-akademik";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EditorTabel } from "./editor-tabel";

export const metadata: Metadata = { title: "Tabel LKPS" };

export default async function HalamanTabelLkps({ params }: PageProps<"/proyek/[proyekId]/lkps/[tabelId]">) {
  const p = await wajibPenanggungJawab();
  const { proyekId, tabelId } = await params;
  const data = await ambilTabel(p, tabelId);
  if (!data || data.proyek.id !== proyekId) notFound();
  const { tabel, berkas, masalah, proyek } = data;
  const peta = Object.entries(petaTS(proyek.tsTahunMulai)).slice(0, 3).map(([l, t]) => `${l} = ${t}`).join(", ");
  return (
    <>
      <JudulHalaman
        judul={tabel.judul}
        deskripsi={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">Sheet {tabel.sheet}</span>
            {tabel.blok && <span>· {tabel.blok}</span>}
            <span>· {berkas.namaBerkas}</span>
            {tabel.perluDicek && <Badge variant="secondary">perlu dicek</Badge>}
            {tabel.dikoreksi && <Badge variant="outline">dikoreksi</Badge>}
          </span>
        }
        remah={[{ label: "Beranda LED", href: `/proyek/${proyekId}` }, { label: "Data LKPS", href: `/proyek/${proyekId}/lkps` }, { label: `Tabel ${tabel.kode}` }]}
      />
      <Petunjuk
        kunci="proyek-lkps-tabel"
        fungsi="Isi satu tabel LKPS hasil bacaan sistem. Koreksi disimpan terpisah dari berkas asli dan dipakai saat menghitung metrik."
        langkah={[
          "Bandingkan dengan berkas LKPS asli.",
          "Klik sel untuk mengoreksi nilai yang salah terbaca, lalu simpan.",
        ]}
      />
      <p className="text-sm text-muted-foreground">Label TS di LKPS tetap ditampilkan apa adanya; di narasi diganti tahun nyata ({peta}).</p>
      {masalah.length > 0 && (
        <Alert>
          <AlertDescription>
            <ul className="list-disc pl-4">{masalah.slice(0, 15).map((m, i) => <li key={i}>{m.pesan}</li>)}</ul>
            {masalah.length > 15 && <p>dan {masalah.length - 15} lainnya.</p>}
          </AlertDescription>
        </Alert>
      )}
      <EditorTabel
        proyekId={proyekId}
        tabelId={tabel.id}
        kolom={tabel.kolom}
        kolomRumus={tabel.kolomRumus}
        baris={tabel.baris}
        perluDicek={tabel.perluDicek}
      />
    </>
  );
}
