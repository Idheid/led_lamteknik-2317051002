import { redirect } from "next/navigation";

/** Revisi 19 Okt 2026: admin langsung masuk ke Akun PJ. */
export default function HalamanAdmin() {
  redirect("/admin/akun");
}
