"use client";

import { useState } from "react";
import { FileDown, FilePen, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { aksiHapusEkspor, aksiMulaiEkspor, aksiSimpanAlasanKonsistensi, aksiUbahDokumen } from "@/app/led/(penyusun)/aksi";

/** Ekspor DRAF (kapan saja, setiap halaman bertanda DRAF) atau ekspor final (setelah Layak diajukan). */
export function TombolEkspor({ proyekId, bisa, jenis }: { proyekId: string; bisa: boolean; jenis: "draf" | "final" }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <Button
      variant={jenis === "draf" ? "outline" : "default"}
      disabled={!bisa || sibuk}
      onClick={() => jalankan(() => aksiMulaiEkspor(proyekId, jenis), {
        lalu: () => toast.success("Ekspor masuk antrean. Berkas siap diunduh dalam beberapa saat; halaman boleh ditinggal."),
      })}
    >
      {sibuk ? <IkonSibuk sibuk /> : jenis === "draf" ? <FilePen aria-hidden /> : <FileDown aria-hidden />}
      {jenis === "draf" ? "Ekspor DRAF" : "Ekspor final"}
    </Button>
  );
}

/** Alasan untuk perbedaan angka yang disengaja (mis. data tahun berbeda); kosongkan untuk menghapus. */
export function AlasanPerbedaan({ proyekId, kunci, awal }: { proyekId: string; kunci: string; awal: string | null }) {
  const { sibuk, jalankan } = useAksi();
  const [buka, setBuka] = useState(false);
  const [alasan, setAlasan] = useState(awal ?? "");
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setBuka(true)}>{awal ? "Ubah alasan" : "Beri alasan"}</Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alasan perbedaan angka</DialogTitle>
            <DialogDescription>Isi bila perbedaan memang disengaja, misalnya angka untuk tahun atau cakupan yang berbeda. Kosongkan untuk menghapus alasan.</DialogDescription>
          </DialogHeader>
          <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Angka 11 adalah jumlah DTPS pada TS-1" aria-label="Alasan" />
          <DialogFooter>
            <Button disabled={sibuk} onClick={() => jalankan(() => aksiSimpanAlasanKonsistensi(proyekId, kunci, alasan), { sukses: "Alasan disimpan.", lalu: () => setBuka(false) })}>
              <IkonSibuk sibuk={sibuk} />Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Isi tautan bukti sahih satu dokumen langsung dari daftar pemeriksaan ekspor. */
export function IsiTautan({ proyekId, id, judul }: { proyekId: string; id: string; judul: string }) {
  const { sibuk, jalankan } = useAksi();
  const [buka, setBuka] = useState(false);
  const [tautan, setTautan] = useState("");
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setBuka(true)}><Link2 aria-hidden />Isi tautan</Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tautan bukti: {judul}</DialogTitle>
            <DialogDescription>Tautan penyimpanan awan (mis. Google Drive) yang bisa dibuka asesor LAM. Dicantumkan di Daftar Rujukan Lampiran.</DialogDescription>
          </DialogHeader>
          <Input placeholder="https://…" value={tautan} onChange={(e) => setTautan(e.target.value)} aria-label="Tautan bukti sahih" />
          <DialogFooter>
            <Button
              disabled={sibuk || !tautan.trim()}
              onClick={() => jalankan(() => aksiUbahDokumen(proyekId, id, { tautanBukti: tautan }), { sukses: "Tautan bukti disimpan.", lalu: () => setBuka(false) })}
            >
              <IkonSibuk sibuk={sibuk} />Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TombolHapusEkspor({ proyekId, eksporId }: { proyekId: string; eksporId: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={<Button variant="ghost" size="icon-sm" aria-label="Hapus berkas ekspor" disabled={sibuk}><Trash2 /></Button>}
      judul="Hapus berkas ekspor ini?"
      deskripsi="Berkas Word hasil ekspor ini dihapus. Narasi dan riwayat versi tidak terpengaruh."
      onKonfirmasi={() => jalankan(() => aksiHapusEkspor(proyekId, eksporId), { sukses: "Berkas ekspor dihapus." })}
    />
  );
}
