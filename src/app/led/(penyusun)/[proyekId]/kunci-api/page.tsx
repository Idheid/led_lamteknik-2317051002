import { redirect } from "next/navigation";

/** Kunci API berlaku untuk seluruh prodi: alamat lama per proyek diarahkan ke satu halaman kunci prodi. */
export default function HalamanKunciProyek() {
  redirect("/pengaturan/kunci-api");
}
