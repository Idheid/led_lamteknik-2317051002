"use client";

import { useState } from "react";
import { CheckCircle2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAksi } from "@/components/aksi-klien";
import { aksiBacaUlangLkps, aksiHapusLkps, aksiJadikanAktif } from "../../aksi";

export function AksiBerkasLkps({ proyekId, id, nama, bisaAktif }: { proyekId: string; id: string; nama: string; bisaAktif: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const [hapus, setHapus] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Aksi untuk ${nama}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {bisaAktif && (
            <DropdownMenuItem onSelect={() => jalankan(() => aksiJadikanAktif(proyekId, id), { sukses: "Berkas ini menjadi sumber data LKPS." })}>
              <CheckCircle2 aria-hidden />
              Jadikan sumber data
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => jalankan(() => aksiBacaUlangLkps(proyekId, id), { sukses: "Berkas diantre untuk dibaca ulang." })}>
            <RefreshCw aria-hidden />
            Baca ulang
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setHapus(true)}>
            <Trash2 aria-hidden />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={hapus} onOpenChange={setHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {nama}?</AlertDialogTitle>
            <AlertDialogDescription>Berkas dan tabel hasil bacanya (termasuk koreksi manual) dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => jalankan(() => aksiHapusLkps(proyekId, id), { sukses: "Berkas LKPS dihapus." })}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
