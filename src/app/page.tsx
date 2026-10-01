import { redirect } from "next/navigation";
import { ambilPengguna } from "@/lib/sesi";
import { berandaPeran } from "@/lib/peran";

export default async function Home() {
  const p = await ambilPengguna();
  redirect(p ? berandaPeran(p.peran) : "/login");
}
