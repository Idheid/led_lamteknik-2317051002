import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import type { KodeJenjang } from "@/modules/bersama/domain/jenjang";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import type { IdentitasProdi } from "@/modules/bersama/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormProdi } from "../form-prodi";
import Link from "next/link";
import { Award, FileText } from "lucide-react";
import { riwayatAkreditasiProdi } from "@/modules/bersama/data/akreditasi";
import { LABEL_JENIS_RIWAYAT, LABEL_STATUS_RIWAYAT } from "@/modules/bersama/domain/akreditasi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KonfirmasiHasil } from "./riwayat-akreditasi";

const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });
const tgl = (d: Date | null) => (d ? fmt.format(d) : "–");

export const metadata: Metadata = { title: "Ubah program studi" };

export default async function HalamanUbahProdi({ params }: PageProps<"/pengaturan/prodi/[id]">) {
  const p = await wajibAdmin();
  const { id } = await params;
  const prodi = await ambilProdi(p, id);
  if (!prodi) notFound();
  const riwayat = await riwayatAkreditasiProdi(p, prodi.id);
  return (
    <>
      <JudulHalaman
        judul={prodi.nama}
        deskripsi={namaJenjang(prodi.jenjang)}
        remah={[{ label: "Program studi", href: "/pengaturan/prodi" }, { label: prodi.nama }]}
      />
      <Petunjuk
        kunci="pj-prodi-ubah"
        fungsi="Identitas program studi. Data ini dipakai di halaman identitas pengusul dan prompt penyusunan narasi."
        langkah={[
          "SK akreditasi baru: klik Catat hasil akreditasi. Tanggal berakhir, peringkat, dan nomor SK prodi diambil dari riwayat.",
          "Mengubah data akreditasi langsung di formulir dicatat sebagai koreksi manual dengan alasan.",
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat akreditasi</CardTitle>
          <CardDescription>Data akreditasi prodi diambil dari baris berlaku terbaru.</CardDescription>
          <CardAction>
            <Button asChild size="sm"><Link href={`/pengaturan/prodi/${prodi.id}/akreditasi`}><Award aria-hidden />Catat hasil akreditasi</Link></Button>
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Periode berlaku</TableHead>
                <TableHead>Peringkat</TableHead>
                <TableHead>SK</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riwayat.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Belum ada riwayat akreditasi.</TableCell></TableRow>
              )}
              {riwayat.map((r) => (
                <TableRow key={r.id} className={r.status === "ditolak" ? "opacity-60" : undefined}>
                  <TableCell className="pl-6 align-top">{tgl(r.berlakuMulai)} – {tgl(r.berlakuSampai)}</TableCell>
                  <TableCell className="align-top">{r.peringkat || "–"}<div className="text-xs text-muted-foreground">{r.lembaga}</div></TableCell>
                  <TableCell className="align-top text-sm">
                    <div>{r.nomorSk ?? "–"}</div>
                    <div className="text-xs text-muted-foreground">{r.tanggalSk ? `ditetapkan ${tgl(r.tanggalSk)}` : ""}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {r.berkasSkLokasi && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`/api/akreditasi/${r.id}/sk`} target="_blank" rel="noreferrer"><FileText className="size-3" aria-hidden />PDF SK</a>}
                      {r.proyekId && <Link className="text-primary hover:underline" href={`/led/asesor/${r.proyekId}`}>LED</Link>}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {LABEL_JENIS_RIWAYAT[r.jenis] ?? r.jenis}
                    {r.alasan && <div className="max-w-64 whitespace-normal text-xs text-muted-foreground">{r.alasan}</div>}
                    {r.dicatatOleh && <div className="text-xs text-muted-foreground">oleh {r.dicatatOleh}</div>}
                  </TableCell>
                  <TableCell className="pr-6 align-top">
                    <Badge variant={r.status === "berlaku" ? "default" : "outline"}>{LABEL_STATUS_RIWAYAT[r.status] ?? r.status}</Badge>
                    {r.status === "menunggu" && <div className="mt-2"><KonfirmasiHasil riwayatId={r.id} /></div>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <FormProdi
        id={prodi.id}
        awal={{
          nama: prodi.nama,
          jenjang: prodi.jenjang as KodeJenjang,
          kodePddikti: prodi.kodePddikti ?? "",
          akreditasiBerlakuSampai: prodi.akreditasiBerlakuSampai ? prodi.akreditasiBerlakuSampai.toISOString().slice(0, 10) : "",
          identitas: (prodi.identitas ?? {}) as Partial<IdentitasProdi>,
        }}
      />
    </>
  );
}
