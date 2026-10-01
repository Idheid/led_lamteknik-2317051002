import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, UserPlus } from "lucide-react";
import { wajibSuperAdmin } from "@/lib/sesi";
import { daftarUpps } from "@/lib/data/organisasi";
import { namaJenjang } from "@/lib/domain/instrumen";
import type { IdentitasProdi } from "@/lib/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogUpps } from "./dialog-upps";
import { TombolHapusProdi, TombolHapusUpps } from "./tombol-hapus";

export const metadata: Metadata = { title: "Prodi dan UPPS" };

export default async function HalamanProdi() {
  const p = await wajibSuperAdmin();
  const daftar = await daftarUpps(p);
  return (
    <>
      <JudulHalaman
        judul="Program studi dan UPPS"
        deskripsi="Satu UPPS (misalnya fakultas) membawahi beberapa program studi. Setiap prodi punya satu akun penanggung jawab."
        aksi={
          <DialogUpps
            pemicu={
              <Button>
                <Plus aria-hidden />
                Tambah UPPS
              </Button>
            }
          />
        }
      />
      {daftar.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada UPPS. Mulai dengan menambah UPPS, lalu program studinya.
          </CardContent>
        </Card>
      )}
      {daftar.map((u) => (
        <Card key={u.id}>
          <CardHeader>
            <CardTitle>
              {u.nama} <span className="font-mono text-sm font-normal text-muted-foreground">· {u.kode}</span>
            </CardTitle>
            <CardDescription>{u.perguruanTinggi}</CardDescription>
            <CardAction className="flex gap-1">
              <DialogUpps
                id={u.id}
                awal={{ kode: u.kode, nama: u.nama, perguruanTinggi: u.perguruanTinggi, alamat: u.alamat ?? "" }}
                pemicu={
                  <Button variant="ghost" size="sm">
                    <Pencil aria-hidden />
                    Ubah
                  </Button>
                }
              />
              {u.prodi.length === 0 && <TombolHapusUpps id={u.id} nama={u.nama} />}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {u.prodi.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program studi</TableHead>
                      <TableHead>Jenjang</TableHead>
                      <TableHead>Kode PDDikti</TableHead>
                      <TableHead>Akreditasi terakhir</TableHead>
                      <TableHead>Penanggung jawab</TableHead>
                      <TableHead className="text-right">Proyek</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {u.prodi.map((pr) => {
                      const ident = (pr.identitas ?? {}) as Partial<IdentitasProdi>;
                      return (
                        <TableRow key={pr.id}>
                          <TableCell className="font-medium">{pr.nama}</TableCell>
                          <TableCell>{namaJenjang(pr.jenjang)}</TableCell>
                          <TableCell className="font-mono text-xs">{pr.kodePddikti ?? "—"}</TableCell>
                          <TableCell>{ident.peringkatAkreditasi ?? "—"}</TableCell>
                          <TableCell>
                            {pr.penanggungJawab ? (
                              <div className="flex items-center gap-2">
                                <span className="truncate">{pr.penanggungJawab.email}</span>
                                {pr.penanggungJawab.banned && <Badge variant="destructive">nonaktif</Badge>}
                              </div>
                            ) : (
                              <Button asChild variant="link" size="sm" className="h-auto px-0">
                                <Link href={`/admin/akun?prodi=${pr.id}`}>
                                  <UserPlus aria-hidden />
                                  Buat akun
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{pr._count.proyek}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="icon-sm" aria-label={`Ubah ${pr.nama}`}>
                              <Link href={`/admin/prodi/${pr.id}`}>
                                <Pencil aria-hidden />
                              </Link>
                            </Button>
                            <TombolHapusProdi id={pr.id} nama={pr.nama} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada program studi di UPPS ini.</p>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/prodi/baru?upps=${u.id}`}>
                <Plus aria-hidden />
                Tambah program studi
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
