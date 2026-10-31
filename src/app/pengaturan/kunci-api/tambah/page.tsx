import { redirect } from "next/navigation";

/** Revisi 31 Okt 2026 (B3): kunci API hanya dikelola Admin UPPS. */
export default function HalamanTambahKunciLama() {
  redirect("/admin/kunci-api/tambah");
}
