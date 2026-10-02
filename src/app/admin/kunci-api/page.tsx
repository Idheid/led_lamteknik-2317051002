import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { HalamanKunci } from "@/components/kunci-api/halaman-kunci";

export const metadata: Metadata = { title: "Kunci API cadangan" };

export default async function HalamanKunciAdmin() {
  const p = await wajibSuperAdmin();
  return <HalamanKunci pengguna={p} />;
}
