import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import type { IdentitasProdi } from "@/modules/bersama/validasi";
import { ShellBersama } from "@/components/shell/shell-bersama";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Card, CardContent } from "@/components/ui/card";
import { FormIdentitasProdi } from "@/app/pengaturan/prodi/form-identitas";

export const metadata: Metadata = { title: "Identitas prodi" };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" });

/** Identitas pengusul prodi Tim Prodi (revisi 31 Okt 2026, B4): SK, alamat, kontak. Nama, jenjang, kode diatur Admin UPPS. */
export default async function HalamanIdentitasProdi() {
  const p = await wajibTimProdi();
  const prodi = await ambilProdi(p, p.prodiId);
  if (!prodi) redirect("/");
  return (
    <ShellBersama pengguna={p}>
      <JudulHalaman
        judul="Identitas prodi"
        deskripsi={`${namaJenjang(prodi.jenjang)} ${prodi.nama}${prodi.kodePddikti ? ` · kode PDDikti ${prodi.kodePddikti}` : ""}${prodi.akreditasiBerlakuSampai ? ` · akreditasi s.d. ${fmtTanggal.format(prodi.akreditasiBerlakuSampai)}` : ""}`}
      />
      <Petunjuk
        kunci="tim-identitas-prodi"
        fungsi="Identitas pengusul dipakai di halaman identitas LED dan prompt penyusunan narasi. Nama prodi, jenjang, kode PDDikti, dan tanggal akreditasi diatur Admin UPPS; perguruan tinggi, UPPS, kota, dan SK pendirian PT diatur Admin di Identitas institusi."
        langkah={["Lengkapi SK pembukaan, tahun pertama menerima mahasiswa, alamat, dan kontak prodi, lalu simpan. Akreditasi terakhir diambil dari riwayat akreditasi."]}
      />
      <Card>
        <CardContent>
          <FormIdentitasProdi prodiId={prodi.id} awal={(prodi.identitas ?? {}) as Partial<IdentitasProdi>} />
        </CardContent>
      </Card>
    </ShellBersama>
  );
}
