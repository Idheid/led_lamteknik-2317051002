import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { prisma } from "@/lib/db";
import { AKTIF, daftarAkun } from "@/lib/data/organisasi";
import { namaJenjang } from "@/lib/domain/instrumen";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AksiBarisAkun, DialogBuatAkun, DialogBuatSuperAdmin } from "./komponen";

export const metadata: Metadata = { title: "Akun" };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export default async function HalamanAkun({ searchParams }: PageProps<"/admin/akun">) {
  const p = await wajibSuperAdmin();
  const { prodi: prodiAwal } = await searchParams;
  const [akun, prodiTanpaAkun] = await Promise.all([
    daftarAkun(p),
    prisma.prodi.findMany({
      where: { akun: { none: AKTIF } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, jenjang: true, upps: { select: { kode: true } } },
    }),
  ]);
  return (
    <>
      <JudulHalaman
        judul="Akun"
        deskripsi="Semua akun dibuat di sini; tidak ada pendaftaran mandiri. Akun baru wajib mengganti kata sandi saat login pertama. Menonaktifkan akun langsung mengeluarkan penggunanya."
        aksi={
          <>
          <DialogBuatSuperAdmin />
          <DialogBuatAkun
            prodi={prodiTanpaAkun.map((x) => ({ id: x.id, label: `${x.nama} (${x.jenjang}) · ${x.upps.kode}` }))}
            prodiAwal={typeof prodiAwal === "string" ? prodiAwal : undefined}
          />
          </>
        }
      />
      <Petunjuk
        kunci="admin-akun"
        fungsi="Mengelola akun super admin dan penanggung jawab prodi. Proyek, kunci API, dan riwayat versi terikat ke prodi, jadi tetap ada walaupun akun dihapus."
        langkah={[
          "Buat akun penanggung jawab (satu akun aktif per prodi) atau akun super admin lain untuk serah terima.",
          "Berikan kata sandi sementara; pengguna wajib menggantinya saat login pertama.",
          "Untuk mengganti penanggung jawab: nonaktifkan akun lama, lalu buat akun baru untuk prodi yang sama.",
          "Atur ulang kata sandi bila pengguna lupa. Akun sendiri tidak bisa dinonaktifkan atau dihapus.",
        ]}
      />
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
                  <TableCell>
                    {a.prodi ? `${a.prodi.nama} (${namaJenjang(a.prodi.jenjang)})` : <span className="text-muted-foreground">—</span>}
                  </TableCell>
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
