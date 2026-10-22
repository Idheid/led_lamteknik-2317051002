import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { daftarAkun } from "@/lib/data/organisasi";
import { statusCadangan } from "@/lib/data/cadangan";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiBarisAkun, DialogBuatAkun, DialogBuatSuperAdmin } from "./komponen";

export const metadata: Metadata = { title: "Akun PJ" };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const fmtWaktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/** Status cadangan harian (revisi 22 Okt 2026): hanya tanggal dan berhasil/gagal, tanpa menu baru. */
function StatusCadangan({ status }: { status: Awaited<ReturnType<typeof statusCadangan>> }) {
  const { terakhir, terakhirBerhasil } = status;
  // eslint-disable-next-line react-hooks/purity -- halaman server dirender per permintaan
  const basi = !terakhirBerhasil || Date.now() - terakhirBerhasil.mulai.getTime() > 48 * 3600_000;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm ${basi ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" : ""}`}>
      <span className="font-medium">Cadangan otomatis:</span>
      {!terakhir && <span className="text-muted-foreground">belum ada. Pastikan worker berjalan; cadangan dibuat setiap hari.</span>}
      {terakhir && (
        <>
          <span>{fmtWaktu.format(terakhir.mulai)}</span>
          {terakhir.berhasil === true && <Badge variant="secondary">Berhasil{terakhir.ukuranMb !== null ? `, ${terakhir.ukuranMb.toLocaleString("id-ID")} MB` : ""}</Badge>}
          {terakhir.berhasil === false && <Badge variant="destructive">Gagal</Badge>}
          {terakhir.berhasil === null && <Badge variant="outline">Sedang berjalan</Badge>}
          {terakhir.berhasil === false && <span className="w-full text-xs text-muted-foreground">{terakhir.pesan}</span>}
          {terakhir.berhasil !== true && (
            <span className="text-xs text-muted-foreground">
              {terakhirBerhasil ? `Cadangan berhasil terakhir: ${fmtWaktu.format(terakhirBerhasil.mulai)}.` : "Belum ada cadangan yang berhasil."}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default async function HalamanAkun() {
  const p = await wajibSuperAdmin();
  const [akun, cadangan] = await Promise.all([daftarAkun(p), statusCadangan(p)]);
  return (
    <>
      <JudulHalaman
        judul="Akun PJ"
        deskripsi="Semua akun dibuat di sini; tidak ada pendaftaran mandiri. Akun baru wajib mengganti kata sandi saat login pertama. Menonaktifkan akun langsung mengeluarkan penggunanya."
        aksi={
          <>
          <DialogBuatSuperAdmin />
          <DialogBuatAkun />
          </>
        }
      />
      <Petunjuk
        kunci="admin-akun"
        fungsi="Mengelola akun PJ fakultas dan admin. PJ mengerjakan semua penyusunan LED; LED, kunci API, dan riwayat versi milik fakultas, jadi tetap ada walaupun akun diganti."
        langkah={[
          "Buat akun PJ fakultas (biasanya satu) atau akun admin lain untuk serah terima.",
          "Berikan kata sandi sementara; pengguna wajib menggantinya saat login pertama.",
          "Saat petugas berganti: buat akun PJ pengganti, lalu nonaktifkan akun lama.",
          "Atur ulang kata sandi bila pengguna lupa. Akun sendiri tidak bisa dinonaktifkan atau dihapus.",
        ]}
      />
      <StatusCadangan status={cadangan} />
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="w-12 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {akun.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-4 font-medium">{a.name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{LABEL_PERAN[a.role as Peran]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.banned ? <Badge variant="destructive">Nonaktif</Badge> : <Badge variant="secondary">Aktif</Badge>}
                      {a.wajibGantiSandi && !a.banned && <Badge variant="outline">Belum ganti sandi</Badge>}
                      {a.id === p.id && <Badge variant="outline">Anda</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtTanggal.format(a.createdAt)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    {a.id !== p.id && <AksiBarisAkun id={a.id} nama={a.name} email={a.email} aktif={!a.banned} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
