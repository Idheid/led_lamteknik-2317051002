import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ambilProyek } from "@/lib/data/proyek";
import { HalamanKunci } from "@/components/kunci-api/halaman-kunci";

export const metadata: Metadata = { title: "Kunci API" };

export default async function HalamanKunciProyek({ params }: PageProps<"/proyek/[proyekId]/kunci-api">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  await ambilProyek(p, proyekId);
  return <HalamanKunci pengguna={p} remah={[{ label: "Beranda", href: `/proyek/${proyekId}` }, { label: "Kunci API" }]} />;
}
