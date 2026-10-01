"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type HasilAksiKlien<T> = { ok: true; data: T } | { ok: false; pesan: string };

/** Jalankan aksi server, tampilkan notifikasi, lalu segarkan data halaman. */
export function useAksi() {
  const router = useRouter();
  const [sibuk, mulai] = useTransition();
  function jalankan<T>(
    aksi: () => Promise<HasilAksiKlien<T>>,
    opsi: { sukses?: string; lalu?: (data: T) => void } = {},
  ) {
    mulai(async () => {
      const r = await aksi();
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      if (opsi.sukses) toast.success(opsi.sukses);
      opsi.lalu?.(r.data);
      router.refresh();
    });
  }
  return { sibuk, jalankan };
}

/** Tombol dengan dialog konfirmasi (hanya untuk aksi menghapus/menimpa). */
export function TombolKonfirmasi({
  pemicu, judul, deskripsi, labelAksi = "Hapus", berbahaya = true, onKonfirmasi,
}: {
  pemicu: ReactNode;
  judul: string;
  deskripsi: ReactNode;
  labelAksi?: string;
  berbahaya?: boolean;
  onKonfirmasi: () => void;
}) {
  const [buka, setBuka] = useState(false);
  return (
    <AlertDialog open={buka} onOpenChange={setBuka}>
      <AlertDialogTrigger asChild>{pemicu}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{judul}</AlertDialogTitle>
          <AlertDialogDescription>{deskripsi}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant={berbahaya ? "destructive" : "default"}
            onClick={() => {
              setBuka(false);
              onKonfirmasi();
            }}
          >
            {labelAksi}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function IkonSibuk({ sibuk }: { sibuk: boolean }) {
  return sibuk ? <Loader2 className="animate-spin" aria-hidden /> : null;
}

export { Button };
