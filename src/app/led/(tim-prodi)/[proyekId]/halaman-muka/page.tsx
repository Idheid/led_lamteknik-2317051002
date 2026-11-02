import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, ImageOff, Lock, PencilLine, ScrollText, Users } from "lucide-react";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import type { IdentitasProdi } from "@/modules/bersama/validasi";
import { ambilProyek } from "@/modules/led/data/proyek";
import { logoDataUrl } from "@/modules/led/data/logo";
import { barisIdentitas, LABEL_ASAL, type AsalData } from "@/modules/led/domain/halaman-muka";
import { dataKosongHalamanAwal } from "@/modules/led/domain/rangkaian";
import { FormIdentitasProdi } from "@/app/pengaturan/prodi/form-identitas";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/modules/bersama/utils";

export const metadata: Metadata = { title: "Halaman muka & identitas" };

const tahunJakarta = () => new Intl.DateTimeFormat("id-ID", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());

function Asal({ asal }: { asal: AsalData }) {
  const bisaDiubah = asal === "prodi";
  return (
    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap font-normal", bisaDiubah ? "border-primary/40 text-primary" : "text-muted-foreground")}>
      {bisaDiubah ? <PencilLine className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
      {LABEL_ASAL[asal]}
    </Badge>
  );
}

/**
 * Halaman muka & identitas (D9, desain form 2, 2 Nov 2026): satu tampilan untuk semua yang tercetak di halaman muka,
 * identitas pengusul, dan tim penyusun LED (bukan narasi). Pratinjau memakai perhitungan yang sama dengan ekspor
 * (`barisIdentitas`). Setiap baris diberi tanda asal: data institusi, Program studi, dan riwayat akreditasi dikunci
 * (diatur Admin UPPS), data prodi bisa diisi langsung di halaman ini (tersimpan ke Identitas prodi, dipakai LED dan LKPS).
 */
export default async function HalamanMukaIdentitas({ params }: PageProps<"/led/[proyekId]/halaman-muka">) {
  const p = await wajibTimProdi();
  const { proyekId } = await params;
  const [proyek, fakultas, logo] = await Promise.all([ambilProyek(p, proyekId), ambilFakultas(), logoDataUrl()]);
  const ident = (proyek.prodi.identitas ?? {}) as Partial<IdentitasProdi>;
  const tim = (proyek.timPenyusun ?? {}) as { dosen?: { nama?: string }[]; tendik?: unknown[] };
  const jumlahTim = (tim.dosen?.length ?? 0) + (tim.tendik?.length ?? 0);
  const jenjang = namaJenjang(proyek.jenjang);
  const baris = barisIdentitas({
    fakultas, identitas: ident as Record<string, string | undefined>, prodi: { nama: proyek.prodi.nama, namaJenjang: jenjang },
  });
  const kosong = dataKosongHalamanAwal({
    prodi: { nama: proyek.prodi.nama, jenjang: proyek.jenjang, kodePddikti: proyek.prodi.kodePddikti },
    identitas: ident as Record<string, string | undefined>,
    fakultas,
    jumlahTim,
    adaLogo: Boolean(logo),
  });
  const semuaKosong = [...kosong.muka, ...kosong.identitas, ...kosong.tim];
  const kota = fakultas?.kota || ident.kota || "";

  return (
    <>
      <JudulHalaman
        judul="Halaman muka & identitas"
        deskripsi="Bagian LED yang tidak disusun AI: halaman muka, identitas pengusul, dan tim penyusun, terisi otomatis saat ekspor."
        remah={[{ label: "Beranda LED", href: `/led/${proyekId}` }, { label: "Halaman muka & identitas" }]}
        aksi={<Button asChild variant="outline"><Link href={`/led/${proyekId}/ekspor`}><ScrollText aria-hidden />Ekspor Word</Link></Button>}
      />
      <Petunjuk
        kunci="proyek-halaman-muka"
        fungsi="Pratinjau ini sama dengan isi Word saat diekspor. Baris bergembok diatur Admin UPPS (Identitas institusi, Program studi, Logo sampul LED) atau diambil dari riwayat akreditasi; baris bertanda pensil diisi Tim Prodi di bawah."
        langkah={[
          "Periksa daftar Masih kosong di atas.",
          "Lengkapi data prodi di kartu Data prodi, lalu simpan. Data ini juga dipakai LKPS dan LED berikutnya.",
          "Lengkapi Tim penyusun, lalu lanjut ke Ekspor Word.",
        ]}
      />

      {semuaKosong.length > 0 ? (
        <Alert>
          <CircleAlert aria-hidden />
          <AlertTitle>Masih kosong ({semuaKosong.length})</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 flex flex-col gap-1">
              {kosong.muka.length > 0 && <li>Halaman muka: {kosong.muka.join(", ")} <span className="text-muted-foreground">(hubungi Admin UPPS)</span></li>}
              {kosong.identitas.length > 0 && (
                <li>Identitas pengusul: {kosong.identitas.map((x) => (x === "Kode PDDikti" ? "Kode PDDikti (Admin UPPS)" : x)).join(", ")}</li>
              )}
              {kosong.tim.length > 0 && <li>Tim penyusun: <Link className="text-primary underline" href={`/led/${proyekId}/tim`}>isi tim penyusun</Link></li>}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert><CheckCircle2 aria-hidden /><AlertTitle>Data halaman muka dan identitas lengkap</AlertTitle><AlertDescription>LED siap diekspor dari sisi data identitas.</AlertDescription></Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card aria-label="Pratinjau halaman muka">
          <CardHeader>
            <CardTitle className="text-base">Halaman muka</CardTitle>
            <CardDescription>Logo dan identitas institusi diatur Admin UPPS.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto flex aspect-[210/297] max-w-72 flex-col items-center justify-between rounded-md border bg-white p-5 text-center text-[10px] leading-snug text-black shadow-xs">
              <p className="font-bold">HALAMAN MUKA</p>
              {logo
                // eslint-disable-next-line @next/next/no-img-element -- data URL kecil dari unggahan Admin
                ? <img src={logo} alt="Logo perguruan tinggi" className="size-20 object-contain" />
                : <div className="flex size-20 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-amber-500 text-[9px] text-amber-700"><ImageOff className="size-4" aria-hidden />Logo belum diunggah</div>}
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold">LAPORAN EVALUASI DIRI PROGRAM STUDI<br />AKREDITASI PROGRAM STUDI</p>
                <p className="font-bold italic">PROGRAM {jenjang.toUpperCase()} {proyek.prodi.nama.toUpperCase()}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-bold">{fakultas?.perguruanTinggi?.toUpperCase() || "–"}</p>
                <p>{fakultas?.nama?.toUpperCase() || "–"}</p>
              </div>
              <div className="flex flex-col gap-1 font-bold">
                <p>{kota.toUpperCase() || "–"}</p>
                <p>TAHUN {tahunJakarta()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="pt-6">
            <CardTitle className="text-base">Identitas pengusul</CardTitle>
            <CardDescription>Urutan sama dengan tabel identitas di template LED.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Isian</TableHead>
                  <TableHead>Nilai di LED</TableHead>
                  <TableHead className="pr-6">Asal data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baris.map((b) => (
                  <TableRow key={b.kunci}>
                    <TableCell className="pl-6 align-top text-muted-foreground whitespace-normal">{b.label}</TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {b.nilai || <span className="text-amber-700 dark:text-amber-300">belum diisi</span>}
                    </TableCell>
                    <TableCell className="pr-6 align-top"><Asal asal={b.asal} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><PencilLine className="size-4 text-primary" aria-hidden />Data prodi</CardTitle>
            <CardDescription>Tersimpan ke Identitas prodi: dipakai LED ini, LED berikutnya, dan LKPS.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormIdentitasProdi prodiId={proyek.prodiId} awal={ident} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" aria-hidden />Tim penyusun</CardTitle>
            <CardDescription>Halaman identitas tim penyusun serta Tabel 2.1 dan 2.2.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {jumlahTim === 0
              ? <p className="text-amber-700 dark:text-amber-300">Belum ada anggota tim.</p>
              : (
                <p>
                  {tim.dosen?.length ?? 0} dosen, {tim.tendik?.length ?? 0} tenaga kependidikan.
                  {tim.dosen?.[0]?.nama && <span className="block text-muted-foreground">Ketua: {tim.dosen[0].nama}</span>}
                </p>
              )}
            <Button asChild variant="outline" className="w-fit"><Link href={`/led/${proyekId}/tim`}>Ubah tim penyusun</Link></Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
