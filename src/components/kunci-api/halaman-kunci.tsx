import { ShieldCheck } from "lucide-react";
import type { Pengguna } from "@/modules/bersama/akses";
import { daftarKunci, LABEL_JENIS_KUNCI, type JenisKunci } from "@/modules/bersama/data/kunci-api";
import { modelAiAktif } from "@/modules/bersama/data/pengaturan";
import { pakaiPenyediaUji } from "@/modules/bersama/llm/embedding";
import { fmtWaktu } from "@/modules/bersama/tampil";
import { JudulHalaman, type Remah } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiKunci } from "./komponen";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const LABEL_STATUS: Record<string, { label: string; varian: "secondary" | "destructive" | "outline" }> = {
  aktif: { label: "Aktif", varian: "secondary" },
  kuota_habis: { label: "Kuota habis", varian: "outline" },
  tidak_valid: { label: "Tidak valid", varian: "destructive" },
  nonaktif: { label: "Nonaktif", varian: "outline" },
};

type BarisKunci = Awaited<ReturnType<typeof daftarKunci>>[number];

const KET_JENIS: Record<JenisKunci, string> = {
  utama: "Dipakai semua LED fakultas dan dicoba lebih dulu.",
  cadangan: "Dipakai setelah semua kunci utama habis, bila diizinkan di tab Model Gemini.",
};

function TabelKunci({ jenis, kunci }: { jenis: JenisKunci; kunci: BarisKunci[] }) {
  return (
    <Card className="py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{LABEL_JENIS_KUNCI[jenis]}</h2>
          <p className="text-xs text-muted-foreground">{KET_JENIS[jenis]}</p>
        </div>
        <Button asChild size="sm" variant={jenis === "utama" ? "default" : "outline"}>
          <Link href={`/admin/kunci-api/tambah?jenis=${jenis}`}><Plus aria-hidden />Tambah kunci</Link>
        </Button>
      </div>
      <CardContent className="px-0">
        {kunci.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Belum ada {LABEL_JENIS_KUNCI[jenis].toLowerCase()}.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Label</TableHead>
                <TableHead>Kunci</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ditambahkan</TableHead>
                <TableHead className="w-12 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kunci.map((k) => {
                const s = LABEL_STATUS[k.statusEfektif] ?? LABEL_STATUS.nonaktif;
                return (
                  <TableRow key={k.id}>
                    <TableCell className="pl-4 font-medium">{k.label}</TableCell>
                    <TableCell className="font-mono text-xs">••••{k.akhiran}</TableCell>
                    <TableCell>
                      <Badge variant={s.varian}>{s.label}</Badge>
                      {k.statusEfektif === "kuota_habis" && k.habisSampai && (
                        <div className="text-xs text-muted-foreground">sampai {fmtWaktu.format(k.habisSampai)} WIB</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtWaktu.format(k.createdAt)}</TableCell>
                    <TableCell className="pr-4 text-right"><AksiKunci id={k.id} label={k.label} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Halaman kunci API Admin UPPS (revisi 31 Okt 2026, B3): kunci utama fakultas dan kunci cadangan di satu halaman. */
export async function HalamanKunci({ pengguna, remah }: { pengguna: Pengguna; remah?: Remah[] }) {
  const [utama, cadangan, model] = await Promise.all([daftarKunci(pengguna, "utama"), daftarKunci(pengguna, "cadangan"), modelAiAktif()]);
  return (
    <>
      <JudulHalaman
        judul="Kunci API"
        remah={remah}
        deskripsi={`Narasi: ${model.labelNarasi}${model.cadangan.length ? ` (cadangan ${model.cadangan.join(", ")})` : ""} · pencarian dokumen: ${model.labelEmbedding}. Ubah di tab Model Gemini.`}
      />
      <Petunjuk
        kunci="kunci-admin"
        fungsi="Kunci API menghubungkan sistem dengan layanan Gemini (Google). Kunci disimpan terenkripsi; setelah disimpan hanya 4 karakter terakhir yang terlihat. Tim Prodi hanya melihat status kunci dan menghubungi Admin UPPS bila kuota habis."
        langkah={[
          "Buka aistudio.google.com, masuk dengan akun Google, pilih Get API key, lalu salin kunci.",
          "Tempel di formulir Tambah kunci, lalu klik Simpan kunci.",
          "Pilih Uji koneksi pada kunci untuk memastikan kunci berfungsi.",
          "Bila kuota habis saat menyusun narasi, tambahkan kunci dari project Google lain; penyusunan lanjut otomatis.",
        ]}
      />
      {pakaiPenyediaUji() && (
        <Alert>
          <AlertTitle>Mode uji embedding aktif</AlertTitle>
          <AlertDescription>EMBEDDING_PENYEDIA=uji: dokumen diindeks dengan embedding uji lokal tanpa memanggil Gemini.</AlertDescription>
        </Alert>
      )}
      <div>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <TabelKunci jenis="utama" kunci={utama} />
          <TabelKunci jenis="cadangan" kunci={cadangan} />
          <Alert>
            <ShieldCheck aria-hidden />
            <AlertTitle>Privasi dan kuota</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                <li>Pada layanan gratis, Google boleh memakai isi permintaan untuk pengembangan produk. Sistem menyamarkan NIDN/NIP/NIM dan nama mahasiswa sebelum dikirim, tetapi tetap hindari dokumen berisi data pribadi bila memakai kunci gratis.</li>
                <li>Kuota dihitung per project Google dan per model, bukan per kunci. Kunci tambahan hanya menambah kuota bila dibuat di project lain.</li>
                <li>Kuota harian direset tengah malam waktu Pasifik (sekitar 14.00–15.00 WIB).</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  );
}
