import type { Metadata } from "next";
import Link from "next/link";
import { wajibSuperAdmin } from "@/lib/sesi";
import { HalamanKunci } from "@/components/kunci-api/halaman-kunci";
import { Button } from "@/components/ui/button";
import { BagianLog } from "./bagian-log";
import { BagianModel } from "./bagian-model";

export const metadata: Metadata = { title: "Kunci API" };

const TAB = [
  { kunci: "kunci", label: "Kunci cadangan" },
  { kunci: "model", label: "Model Gemini" },
  { kunci: "pemakaian", label: "Pemakaian" },
] as const;

/** Revisi 19 Okt 2026: admin hanya punya Akun PJ dan Kunci API; pilihan model dan log pemakaian ada di sini. */
export default async function HalamanKunciAdmin({ searchParams }: PageProps<"/admin/kunci-api">) {
  const p = await wajibSuperAdmin();
  const q = await searchParams;
  const tab = TAB.find((t) => t.kunci === q.tab)?.kunci ?? "kunci";
  return (
    <>
      <nav aria-label="Bagian halaman Kunci API" className="flex flex-wrap gap-1 border-b pb-2">
        {TAB.map((t) => (
          <Button key={t.kunci} asChild size="sm" variant={t.kunci === tab ? "secondary" : "ghost"}>
            <Link href={`/admin/kunci-api?tab=${t.kunci}`} aria-current={t.kunci === tab ? "page" : undefined}>{t.label}</Link>
          </Button>
        ))}
      </nav>
      {tab === "kunci" && <HalamanKunci pengguna={p} hrefTambah="/admin/kunci-api/tambah" />}
      {tab === "model" && <BagianModel p={p} />}
      {tab === "pemakaian" && <BagianLog p={p} hariMasukan={typeof q.hari === "string" ? q.hari : undefined} />}
    </>
  );
}
