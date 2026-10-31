"use client";

import { useState } from "react";
import { Download, Link2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiHapusDokumen, aksiProsesUlangDokumen, aksiUbahDokumen } from "@/app/led/(tim-prodi)/aksi";

export function AksiDokumen({
  proyekId, id, nama, jenis, judul, tautanBukti, tahunTerbit,
}: { proyekId: string; id: string; nama: string; jenis: string; judul: string | null; tautanBukti: string | null; tahunTerbit?: number | null }) {
  const { sibuk, jalankan } = useAksi();
  const [dialog, setDialog] = useState<"ubah" | "hapus" | null>(null);
  const [nilai, setNilai] = useState({ judul: judul ?? "", tautanBukti: tautanBukti ?? "", tahun: tahunTerbit ? String(tahunTerbit) : "" });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Aksi untuk ${nama}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("ubah")}>
            <Link2 aria-hidden />
            {jenis === "gambar" ? "Judul gambar dan tautan" : "Judul, tahun, dan tautan bukti"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/led/dokumen/${id}/berkas?unduh`}>
              <Download aria-hidden />
              Unduh berkas asli
            </a>
          </DropdownMenuItem>
          {jenis !== "gambar" && (
            <DropdownMenuItem onSelect={() => jalankan(() => aksiProsesUlangDokumen(proyekId, id), { sukses: "Dokumen diantre untuk diproses ulang." })}>
              <RefreshCw aria-hidden />
              Proses ulang
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("hapus")}>
            <Trash2 aria-hidden />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "ubah"} onOpenChange={(b) => setDialog(b ? "ubah" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nama}</DialogTitle>
            <DialogDescription>
              {jenis === "gambar"
                ? "Judul gambar dipakai sebagai keterangan saat gambar disisipkan ke narasi."
                : "Judul dan tahun dipakai sebagai rujukan di Word, misalnya (Renstra FT 2021–2025, 2021), dan di Daftar Rujukan Lampiran."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`judul-${id}`}>{jenis === "gambar" ? "Judul gambar" : "Judul dokumen"}</FieldLabel>
              <Input id={`judul-${id}`} value={nilai.judul} onChange={(e) => setNilai({ ...nilai, judul: e.target.value })} />
            </Field>
            {jenis !== "gambar" && (
              <Field>
                <FieldLabel htmlFor={`tahun-${id}`}>Tahun terbit</FieldLabel>
                <Input id={`tahun-${id}`} inputMode="numeric" placeholder="2021" value={nilai.tahun} onChange={(e) => setNilai({ ...nilai, tahun: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="w-28" />
                <FieldDescription>Kosong ditulis &quot;t.t.&quot; (tanpa tahun) di rujukan.</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={`tautan-${id}`}>Tautan bukti sahih</FieldLabel>
              <Input id={`tautan-${id}`} placeholder="https://…" value={nilai.tautanBukti} onChange={(e) => setNilai({ ...nilai, tautanBukti: e.target.value })} />
              <FieldDescription>Kosongkan bila tidak ada.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              disabled={sibuk}
              onClick={() => jalankan(
                () => aksiUbahDokumen(proyekId, id, {
                  judul: nilai.judul, tautanBukti: nilai.tautanBukti, ...(jenis !== "gambar" ? { tahunTerbit: nilai.tahun ? Number(nilai.tahun) : null } : {}),
                }),
                { sukses: "Dokumen diperbarui.", lalu: () => setDialog(null) },
              )}
            >
              <IkonSibuk sibuk={sibuk} />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "hapus"} onOpenChange={(b) => setDialog(b ? "hapus" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {nama}?</AlertDialogTitle>
            <AlertDialogDescription>Berkas dan potongan teksnya dihapus permanen sehingga tidak bisa lagi dipakai sebagai sumber narasi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => jalankan(() => aksiHapusDokumen(proyekId, id), { sukses: "Dokumen dihapus." })}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
