import type { Metadata } from "next";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { daftarAkun, daftarProdi } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { statusCadangan } from "@/modules/bersama/data/cadangan";
import { LABEL_PERAN, type Peran } from "@/modules/bersama/peran";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AksiBarisAkun } from "./komponen";

export const metadata: Metadata = { title: "Kelola akun" };

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
  const p = await wajibAdmin();
  const [akun, cadangan, daftar] = await Promise.all([daftarAkun(p), statusCadangan(p), daftarProdi(p)]);
  const prodi = daftar.map((x) => ({ id: x.id, label: `${namaJenjang(x.jenjang)} ${x.nama}` }));
  return (
    <>
      <JudulHalaman
        judul="Kelola akun"
        aksi={<Button asChild size="lg"><Link href="/admin/akun/tambah"><Plus aria-hidden />Tambah akun</Link></Button>}
      />
      <Petunjuk
        kunci="admin-akun"
        fungsi="Admin UPPS mengelola akun. Tim Prodi menyusun LED program studinya (satu prodi boleh beberapa akun); asesor mereview LED yang ditugaskan; Admin UPPS mengurus akun, program studi, instrumen, kunci API, dan penugasan asesor. LED dan kunci API milik prodi dan fakultas, jadi tetap ada walaupun akun diganti."
        langkah={[
          "Klik Tambah akun, pilih peran (Tim Prodi, Asesor, atau Admin UPPS), lalu isi nama, email, dan kata sandi awal. Akun Tim Prodi wajib memilih program studi.",
          "Berikan kata sandi sementara; pengguna wajib menggantinya saat login pertama.",
          "Saat anggota tim berganti: buat akun Tim Prodi pengganti, lalu nonaktifkan akun lama. Akun yang pindah prodi: menu baris, Pindah program studi.",
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
                <TableHead>Program studi</TableHead>
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
                  <TableCell className="text-muted-foreground">{a.prodi ? `${namaJenjang(a.prodi.jenjang)} ${a.prodi.nama}` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.banned ? <Badge variant="destructive">Nonaktif</Badge> : <Badge variant="secondary">Aktif</Badge>}
                      {a.wajibGantiSandi && !a.banned && <Badge variant="outline">Belum ganti sandi</Badge>}
                      {a.id === p.id && <Badge variant="outline">Anda</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtTanggal.format(a.createdAt)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    {a.id !== p.id && <AksiBarisAkun id={a.id} nama={a.name} email={a.email} aktif={!a.banned} prodiId={a.role === "TIM_PRODI" ? a.prodi?.id ?? null : undefined} prodi={prodi} />}
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
