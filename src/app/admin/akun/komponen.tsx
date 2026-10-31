"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, MoreHorizontal, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaAkunPenanggungJawab, type MasukanAkun } from "@/modules/bersama/validasi";
import { aksiAturAktifAkun, aksiAturUlangSandi, aksiBuatAkun, aksiBuatAsesor, aksiBuatSuperAdmin, aksiHapusAkun } from "../aksi";

type PeranBaru = "PJ" | "ASESOR" | "ADMIN";

/** Tiga peran (revisi 22 Okt 2026), dijelaskan singkat supaya admin tahu akun mana yang dibuat. */
const PERAN_BARU: { kunci: PeranBaru; judul: string; isi: string }[] = [
  { kunci: "PJ", judul: "Penanggung jawab (PJ)", isi: "Menyusun semua LED fakultas: prodi, LKPS, dokumen, narasi, ekspor Word." },
  { kunci: "ASESOR", judul: "Asesor", isi: "Membaca LED yang ditugaskan, memberi catatan revisi dan skor. Tugaskan di menu Penugasan asesor." },
  { kunci: "ADMIN", judul: "Admin", isi: "Mengelola akun, penugasan asesor, kunci API cadangan, dan model AI." },
];

/** Satu tombol Tambah akun dengan pilihan peran (revisi 23 Okt 2026; sebelumnya tiga tombol yang mudah terlewat). */
export function DialogTambahAkun() {
  const [buka, setBuka] = useState(false);
  const [peran, setPeran] = useState<PeranBaru>("PJ");
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanAkun>({
    resolver: zodResolver(skemaAkunPenanggungJawab),
    defaultValues: { nama: "", email: "", kataSandi: "" },
  });
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => (peran === "ASESOR" ? aksiBuatAsesor(nilai) : peran === "ADMIN" ? aksiBuatSuperAdmin(nilai) : aksiBuatAkun(nilai)), {
      sukses: "Akun dibuat. Sampaikan email dan kata sandi awalnya; pemilik akun wajib menggantinya saat login pertama.",
      lalu: () => {
        setBuka(false);
        form.reset({ nama: "", email: "", kataSandi: "" });
      },
    }),
  );
  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus aria-hidden />
          Tambah akun
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah akun</DialogTitle>
          <DialogDescription>Pilih peran, lalu isi nama, email, dan kata sandi awal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} noValidate>
          <FieldGroup>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Peran</legend>
              {PERAN_BARU.map((x) => (
                <label
                  key={x.kunci}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${peran === x.kunci ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                >
                  <input type="radio" name="peran" value={x.kunci} checked={peran === x.kunci} onChange={() => setPeran(x.kunci)} className="mt-1 accent-[var(--primary)]" />
                  <span>
                    <span className="block font-medium">{x.judul}</span>
                    <span className="block text-muted-foreground">{x.isi}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="akun-nama">Nama</FieldLabel>
                  <Input {...field} id="akun-nama" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="akun-email">Email</FieldLabel>
                  <Input {...field} id="akun-email" type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="kataSandi"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="akun-sandi">Kata sandi awal</FieldLabel>
                  <Input {...field} id="akun-sandi" type="password" autoComplete="new-password" aria-invalid={fieldState.invalid} />
                  <FieldDescription>Minimal 8 karakter.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={sibuk}>
              <IkonSibuk sibuk={sibuk} />
              Buat akun
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AksiBarisAkun({ id, nama, email, aktif }: { id: string; nama: string; email: string; aktif: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const [dialog, setDialog] = useState<"sandi" | "hapus" | null>(null);
  const [sandi, setSandi] = useState("");
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Aksi untuk ${nama}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("sandi")}>
            <KeyRound aria-hidden />
            Atur ulang kata sandi
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              jalankan(() => aksiAturAktifAkun(id, !aktif), { sukses: aktif ? `${email} dinonaktifkan.` : `${email} diaktifkan.` })
            }
          >
            <Power aria-hidden />
            {aktif ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("hapus")}>
            <Trash2 aria-hidden />
            Hapus akun
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "sandi"} onOpenChange={(b) => { setDialog(b ? "sandi" : null); setSandi(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur ulang kata sandi</DialogTitle>
            <DialogDescription>{email} akan keluar dari semua perangkat dan harus masuk dengan kata sandi baru.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`sandi-${id}`}>Kata sandi baru</FieldLabel>
            <Input id={`sandi-${id}`} type="password" autoComplete="new-password" value={sandi} onChange={(e) => setSandi(e.target.value)} />
            <FieldDescription>Minimal 8 karakter.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button
              disabled={sibuk || sandi.length < 8}
              onClick={() =>
                jalankan(() => aksiAturUlangSandi(id, sandi), {
                  sukses: "Kata sandi diperbarui.",
                  lalu: () => { setDialog(null); setSandi(""); },
                })
              }
            >
              <IkonSibuk sibuk={sibuk} />
              Simpan kata sandi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "hapus"} onOpenChange={(b) => setDialog(b ? "hapus" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun {email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun dihapus permanen. Proyek LED, kunci API, dan riwayat versi prodi tetap ada dan bisa dipakai akun
              penanggung jawab baru. Bila hanya ingin mencegah login, pilih Nonaktifkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => jalankan(() => aksiHapusAkun(id), { sukses: "Akun dihapus." })}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
