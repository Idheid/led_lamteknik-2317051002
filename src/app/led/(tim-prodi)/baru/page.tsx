import { redirect } from "next/navigation";

/** Perbaikan 1 Nov 2026 (P5): LED baru dimulai dari kartu "Mulai LED {prodi}" di /led; tautan lama diarahkan ke sana. */
export default function HalamanLedBaru() {
  redirect("/led");
}
