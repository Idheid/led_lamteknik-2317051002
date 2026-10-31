import type { Metadata } from "next";
import Link from "next/link";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { HalamanKunci } from "@/components/kunci-api/halaman-kunci";
import { Button } from "@/components/ui/button";
import { BagianLog } from "./bagian-log";
import { BagianModel } from "./bagian-model";

export const metadata: Metadata = { title: "Kunci API" };

const TAB = [
  { kunci: "kunci", label: "Kunci" },
  { kunci: "model", label: "Model Gemini" },
  { kunci: "pemakaian", label: "Pemakaian" },
] as const;

/** Kunci API (revisi 31 Okt 2026: kunci utama fakultas dan kunci cadangan dikelola Admin UPPS), model Gemini, dan log pemakaian. */
export default async function HalamanKunciAdmin({ searchParams }: PageProps<"/admin/kunci-api">) {
  const p = await wajibAdmin();
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
      {tab === "kunci" && <HalamanKunci pengguna={p} />}
      {tab === "model" && <BagianModel p={p} />}
      {tab === "pemakaian" && <BagianLog p={p} hariMasukan={typeof q.hari === "string" ? q.hari : undefined} />}
    </>
  );
}
