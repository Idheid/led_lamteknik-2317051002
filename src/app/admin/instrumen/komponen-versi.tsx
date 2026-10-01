"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FolderOpen, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAksi } from "@/components/aksi-klien";
import { aksiAturAktifVersi, aksiHapusVersi, aksiSalinVersi } from "../aksi";

export function SaklarAktifVersi({ id, aktif }: { id: string; aktif: boolean }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <Switch
      checked={aktif}
      disabled={sibuk}
      aria-label={aktif ? "Nonaktifkan versi" : "Aktifkan versi"}
      onCheckedChange={(b) => jalankan(() => aksiAturAktifVersi(id, b), { sukses: b ? "Versi diaktifkan." : "Versi dinonaktifkan." })}
    />
  );
}

export function TombolSalinVersi({ id, varian = "outline" }: { id: string; varian?: "outline" | "default" }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  return (
    <Button
      variant={varian}
      disabled={sibuk}
      onClick={() =>
        jalankan(() => aksiSalinVersi(id), {
          sukses: "Versi disalin. Salinan masih nonaktif; sunting lalu aktifkan.",
          lalu: (baru) => router.push(`/admin/instrumen/${baru}`),
        })
      }
    >
      <Copy aria-hidden />
      {sibuk ? "Menyalin…" : "Salin versi"}
    </Button>
  );
}

export function AksiVersi({ id, kode, dipakai }: { id: string; kode: string; dipakai: boolean }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [hapus, setHapus] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Aksi untuk ${kode}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/admin/instrumen/${id}`)}>
            <FolderOpen aria-hidden />
            Buka
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              jalankan(() => aksiSalinVersi(id), {
                sukses: "Versi disalin. Salinan masih nonaktif; sunting lalu aktifkan.",
                lalu: (baru) => router.push(`/admin/instrumen/${baru}`),
              })
            }
          >
            <Copy aria-hidden />
            Salin menjadi versi baru
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={dipakai} onSelect={() => setHapus(true)}>
            <Trash2 aria-hidden />
            {dipakai ? "Dipakai proyek, tidak bisa dihapus" : "Hapus"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={hapus} onOpenChange={setHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus versi {kode}?</AlertDialogTitle>
            <AlertDialogDescription>Semua bagian, sub-bagian, dan butir di versi ini ikut terhapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => jalankan(() => aksiHapusVersi(id), { sukses: "Versi dihapus." })}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
