"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { aksiArsipProyek, aksiHapusProyek, aksiUbahNamaProyek } from "@/app/led/(penyusun)/aksi";

/** Ubah nama, arsipkan/aktifkan kembali, dan hapus proyek (dengan mengetik ulang nama). */
export function PengaturanProyek({ proyekId, nama, diarsipkan }: { proyekId: string; nama: string; diarsipkan: boolean }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [ubah, setUbah] = useState(false);
  const [namaBaru, setNamaBaru] = useState(nama);
  const [hapus, setHapus] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={ubah} onOpenChange={(b) => { setUbah(b); setNamaBaru(nama); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={diarsipkan}><Pencil aria-hidden />Ubah nama</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah nama proyek</DialogTitle>
            <DialogDescription>Nama hanya label; program studi proyek tetap mengikuti akun Anda.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="nama-proyek">Nama proyek</FieldLabel>
            <Input id="nama-proyek" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} maxLength={200} />
          </Field>
          <DialogFooter>
            <Button
              disabled={sibuk || !namaBaru.trim() || namaBaru.trim() === nama}
              onClick={() => jalankan(() => aksiUbahNamaProyek(proyekId, namaBaru), { sukses: "Nama proyek diubah.", lalu: () => setUbah(false) })}
            >
              <IkonSibuk sibuk={sibuk} />Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        disabled={sibuk}
        onClick={() => jalankan(() => aksiArsipProyek(proyekId, !diarsipkan), {
          sukses: diarsipkan ? "Proyek aktif kembali." : "Proyek diarsipkan: tetap tersimpan dan bisa dibuka sebagai rujukan.",
        })}
      >
        {diarsipkan ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {diarsipkan ? "Aktifkan kembali" : "Arsipkan"}
      </Button>

      <Dialog open={hapus} onOpenChange={(b) => { setHapus(b); setKonfirmasi(""); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 aria-hidden />Hapus proyek</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus proyek secara permanen?</DialogTitle>
            <DialogDescription>
              Semua draf, riwayat versi, LKPS, dokumen, dan berkas ekspor proyek ini ikut terhapus dan tidak bisa
              dikembalikan. Untuk LED periode lama, pilih <strong>Arsipkan</strong> saja.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="konfirmasi-hapus">Ketik nama proyek untuk konfirmasi</FieldLabel>
            <Input id="konfirmasi-hapus" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} placeholder={nama} autoComplete="off" />
            <FieldDescription>{nama}</FieldDescription>
          </Field>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={sibuk || konfirmasi.trim() !== nama}
              onClick={() => jalankan(() => aksiHapusProyek(proyekId, konfirmasi), {
                lalu: () => {
                  toast.success("Proyek dihapus.");
                  router.push("/led");
                },
              })}
            >
              <IkonSibuk sibuk={sibuk} />Hapus permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
