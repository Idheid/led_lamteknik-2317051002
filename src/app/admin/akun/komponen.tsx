"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, MoreHorizontal, Plus, Power, ShieldPlus, Trash2 } from "lucide-react";
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
import { skemaAkunPenanggungJawab, skemaAkunSuperAdmin, type MasukanAkun, type MasukanAkunSuperAdmin } from "@/lib/validasi";
import { aksiAturAktifAkun, aksiAturUlangSandi, aksiBuatAkun, aksiBuatSuperAdmin, aksiHapusAkun } from "../aksi";

/** Akun PJ fakultas (revisi 19 Okt 2026: tidak terikat ke satu prodi). */
export function DialogBuatAkun() {
  const [buka, setBuka] = useState(false);
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanAkun>({
    resolver: zodResolver(skemaAkunPenanggungJawab),
    defaultValues: { nama: "", email: "", kataSandi: "" },
  });
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiBuatAkun(nilai), {
      sukses: "Akun PJ dibuat. Sampaikan email dan kata sandinya ke pemilik akun.",
      lalu: () => {
        setBuka(false);
        form.reset({ nama: "", email: "", kataSandi: "" });
      },
    }),
  );
  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          Buat akun PJ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Akun PJ fakultas baru</DialogTitle>
          <DialogDescription>PJ mengelola semua prodi, LED, instrumen, dan dokumen fakultas. Saat petugas berganti, buat akun pengganti lalu nonaktifkan akun lama.</DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} noValidate>
          <FieldGroup>
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

export function DialogBuatSuperAdmin() {
  const [buka, setBuka] = useState(false);
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanAkunSuperAdmin>({
    resolver: zodResolver(skemaAkunSuperAdmin),
    defaultValues: { nama: "", email: "", kataSandi: "" },
  });
  const kirim = form.handleSubmit((nilai) =>
    jalankan(() => aksiBuatSuperAdmin(nilai), {
      sukses: "Akun admin dibuat. Pemilik akun wajib mengganti kata sandi saat login pertama.",
      lalu: () => {
        setBuka(false);
        form.reset({ nama: "", email: "", kataSandi: "" });
      },
    }),
  );
  const kolom = [
    { name: "nama", label: "Nama", tipe: "text" },
    { name: "email", label: "Email", tipe: "email" },
    { name: "kataSandi", label: "Kata sandi awal", tipe: "password" },
  ] as const;
  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ShieldPlus aria-hidden />
          Admin baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Akun admin baru</DialogTitle>
          <DialogDescription>Untuk serah terima pengelolaan ke fakultas. Admin bisa mengelola instrumen, prodi, dan semua akun.</DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} noValidate>
          <FieldGroup>
            {kolom.map((k) => (
              <Controller
                key={k.name}
                name={k.name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`sa-${k.name}`}>{k.label}</FieldLabel>
                    <Input {...field} id={`sa-${k.name}`} type={k.tipe} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {k.name === "kataSandi" && <FieldDescription>Minimal 8 karakter.</FieldDescription>}
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={sibuk}>
              <IkonSibuk sibuk={sibuk} />
              Buat admin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
