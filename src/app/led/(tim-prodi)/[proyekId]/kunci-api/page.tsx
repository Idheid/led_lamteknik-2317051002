import { redirect } from "next/navigation";

/** Alamat lama kunci API per LED: kunci dikelola Admin UPPS (revisi 31 Okt 2026); Tim Prodi melihat statusnya di Beranda LED. */
export default async function HalamanKunciProyek({ params }: PageProps<"/led/[proyekId]/kunci-api">) {
  redirect(`/led/${(await params).proyekId}`);
}
