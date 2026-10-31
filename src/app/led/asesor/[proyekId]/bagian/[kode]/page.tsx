import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { wajibPeran } from "@/modules/bersama/sesi";
import { halamanBagian } from "@/modules/led/data/proyek";
import { drafBagian } from "@/modules/led/data/generate";
import { jumlahCatatanPerSub } from "@/modules/led/data/review";
import { subDigenerate } from "@/modules/led/domain/navigasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({ params }: PageProps<"/led/asesor/[proyekId]/bagian/[kode]">): Promise<Metadata> {
  return { title: decodeURIComponent((await params).kode) };
}

/** Daftar sub-bagian satu kriteria/bab untuk asesor: ada draf atau belum, dan catatan yang belum selesai. */
export default async function HalamanBagianAsesor({ params }: PageProps<"/led/asesor/[proyekId]/bagian/[kode]">) {
  const p = await wajibPeran("ASESOR", "ADMIN");
  const { proyekId, kode: kodeMentah } = await params;
  const kode = decodeURIComponent(kodeMentah);
  const [h, draf, jumlah] = await Promise.all([halamanBagian(p, proyekId, kode), drafBagian(p, proyekId, kode), jumlahCatatanPerSub(p, proyekId)]);
  if (!h) notFound();
  const sub = h.bagian.subBagian.filter((s) => subDigenerate(s.tipe));
  return (
    <>
      <JudulHalaman
        judul={<>{h.bagian.jenis === "kriteria" && <span className="mr-2 font-mono text-muted-foreground">{h.bagian.kode}</span>}{h.bagian.nama}</>}
        remah={[{ label: "Ringkasan review", href: `/led/asesor/${proyekId}` }, { label: h.bagian.kode }]}
      />
      <ul className="divide-y rounded-lg border text-sm">
        {sub.length === 0 && <li className="px-4 py-3 text-muted-foreground">Bagian ini tidak punya narasi.</li>}
        {sub.map((s) => {
          const n = jumlah[s.kode];
          const ada = Boolean(draf[s.kode]?.aktif);
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <Link
                href={`/led/asesor/${proyekId}/bagian/${encodeURIComponent(kode)}/${encodeURIComponent(s.kode)}`}
                className="min-w-0 flex-1 text-primary hover:underline"
              >
                {s.label && <span className="mr-2 font-mono text-muted-foreground">{s.label}</span>}{s.judul}
              </Link>
              <span className="flex flex-wrap gap-1.5">
                {!ada && <Badge variant="outline">Belum ada draf</Badge>}
                {n?.terbuka ? <Badge variant="outline">{n.terbuka} terbuka</Badge> : null}
                {n?.diperbaiki ? <Badge>{n.diperbaiki} sudah diperbaiki</Badge> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
