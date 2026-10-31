import { redirect } from "next/navigation";

/** Revisi 31 Okt 2026 (B3): kunci API hanya dikelola Admin UPPS di satu halaman. */
export default function HalamanKunciLama() {
  redirect("/admin/kunci-api");
}
