"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, KeyRound, MoreHorizontal, PenLine, Power, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputSandi } from "@/components/input-sandi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { skemaAkun, type MasukanAkun } from "@/modules/bersama/validasi";
import type { Peran } from "@/modules/bersama/peran";
import { aksiAturAktifAkun, aksiAturUlangSandi, aksiBuatAdmin, aksiBuatAsesor, aksiBuatTimProdi, aksiHapusAkun, aksiPindahProdi } from "../aksi";

export interface PilihanProdi {
  id: string;
  label: string;
}

/** Tiga peran (revisi 31 Okt 2026), dijelaskan singkat supaya admin tahu akun mana yang dibuat. */
export const PERAN_BARU: { kunci: Peran; judul: string; isi: string }[] = [
  { kunci: "TIM_PRODI", judul: "Tim Prodi", isi: "Menyusun LED program studinya: LKPS, dokumen, narasi, ekspor Word. Satu prodi boleh beberapa akun." },
  { kunci: "ASESOR", judul: "Reviewer LPMPP", isi: "Reviewer internal LPMPP: membaca LED yang ditugaskan, memberi catatan revisi dan skor. Tugaskan di menu Penugasan reviewer LPMPP." },
  { kunci: "ADMIN", judul: "Admin UPPS", isi: "Mengelola akun, program studi, instrumen, Basis Pengetahuan fakultas, kunci API, dan penugasan asesor." },
];

/**
 * Formulir Tambah akun (perbaikan 1 Nov 2026, P2: halaman sendiri `/admin/akun/tambah`, sebelumnya dialog yang
 * terpotong di layar laptop). Pilihan peran dengan penjelasan; akun Tim Prodi wajib memilih program studi.
 */
export function FormTambahAkun({ prodi, prodiAwal = "" }: { prodi: PilihanProdi[]; prodiAwal?: string }) {
  const router = useRouter();
  const [peran, setPeran] = useState<Peran>("TIM_PRODI");
  // L3: dari Pantau LED, prodi sudah terpilih
  const [prodiId, setProdiId] = useState(prodi.some((x) => x.id === prodiAwal) ? prodiAwal : "");
  const [galatProdi, setGalatProdi] = useState(false);
  const { sibuk, jalankan } = useAksi();
  const form = useForm<MasukanAkun>({
    resolver: zodResolver(skemaAkun),
    defaultValues: { nama: "", email: "", kataSandi: "" },
  });
  const kirim = form.handleSubmit((nilai) => {
    if (peran === "TIM_PRODI" && !prodiId) {
      setGalatProdi(true);
      return;
    }
    return jalankan(() => (peran === "ASESOR" ? aksiBuatAsesor(nilai) : peran === "ADMIN" ? aksiBuatAdmin(nilai) : aksiBuatTimProdi({ ...nilai, prodiId })), {
      sukses: "Akun dibuat. Sampaikan email dan kata sandi awalnya; pemilik akun wajib menggantinya saat login pertama.",
      lalu: () => router.push("/admin/akun"),
    });
  });
  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Peran</legend>
          <div className="grid gap-2 md:grid-cols-3">
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
          </div>
        </fieldset>
        {peran === "TIM_PRODI" && (
          <Field data-invalid={galatProdi && !prodiId}>
            <FieldLabel htmlFor="akun-prodi">Program studi</FieldLabel>
            <Select value={prodiId} onValueChange={(v) => { setProdiId(v); setGalatProdi(false); }}>
              <SelectTrigger id="akun-prodi" className="w-full" aria-invalid={galatProdi && !prodiId}><SelectValue placeholder="Pilih program studi" /></SelectTrigger>
              <SelectContent>
                {prodi.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {prodi.length === 0 && <FieldDescription>Belum ada program studi. Tambahkan dulu di menu Program studi.</FieldDescription>}
            {galatProdi && !prodiId && <FieldError>Pilih program studi.</FieldError>}
          </Field>
        )}
        <div className="grid gap-4 md:grid-cols-3">
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
                <InputSandi {...field} id="akun-sandi" autoComplete="new-password" aria-invalid={fieldState.invalid} />
                <FieldDescription>Minimal 8 karakter.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <Button type="submit" size="lg" className="w-fit" disabled={sibuk}>
          <IkonSibuk sibuk={sibuk} />
          Buat akun
        </Button>
      </FieldGroup>
    </form>
  );
}

export function AksiBarisAkun({ id, nama, email, aktif, prodiId, prodi }: {
  id: string; nama: string; email: string; aktif: boolean;
  /** Prodi akun Tim Prodi; undefined untuk Admin UPPS dan Asesor (tidak bisa dipindah). */
  prodiId?: string | null;
  prodi: PilihanProdi[];
}) {
  const { sibuk, jalankan } = useAksi();
  const [dialog, setDialog] = useState<"sandi" | "hapus" | "pindah" | null>(null);
  const [sandi, setSandi] = useState("");
  const [prodiBaru, setProdiBaru] = useState("");
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Aksi untuk ${nama}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/akun/${id}/nama`}><PenLine aria-hidden />Ubah nama</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/akun/${id}/peran`}><UserCog aria-hidden />Ubah peran</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("sandi")}>
            <KeyRound aria-hidden />
            Atur ulang kata sandi
          </DropdownMenuItem>
          {prodiId !== undefined && (
            <DropdownMenuItem onSelect={() => { setProdiBaru(prodiId ?? ""); setDialog("pindah"); }}>
              <ArrowRightLeft aria-hidden />
              Pindah program studi
            </DropdownMenuItem>
          )}
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
            <InputSandi id={`sandi-${id}`} autoComplete="new-password" value={sandi} onChange={(e) => setSandi(e.target.value)} />
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

      <Dialog open={dialog === "pindah"} onOpenChange={(b) => setDialog(b ? "pindah" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pindah program studi</DialogTitle>
            <DialogDescription>{email} akan keluar dari semua perangkat; setelah masuk lagi, ia menyusun LED prodi yang baru.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`pindah-${id}`}>Program studi</FieldLabel>
            <Select value={prodiBaru} onValueChange={setProdiBaru}>
              <SelectTrigger id={`pindah-${id}`} className="w-full"><SelectValue placeholder="Pilih program studi" /></SelectTrigger>
              <SelectContent>
                {prodi.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button
              disabled={sibuk || !prodiBaru || prodiBaru === prodiId}
              onClick={() => jalankan(() => aksiPindahProdi(id, prodiBaru), { sukses: "Program studi akun diperbarui.", lalu: () => setDialog(null) })}
            >
              <IkonSibuk sibuk={sibuk} />
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "hapus"} onOpenChange={(b) => setDialog(b ? "hapus" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun {email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun dihapus permanen. LED, kunci API, dan riwayat versi prodi tetap ada dan bisa dipakai akun Tim Prodi
              lain di prodi itu. Bila hanya ingin mencegah login, pilih Nonaktifkan.
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
