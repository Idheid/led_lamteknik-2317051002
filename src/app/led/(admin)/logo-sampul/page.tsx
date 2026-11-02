import type { Metadata } from "next";
import { ImageOff } from "lucide-react";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { ambilLogo, logoDataUrl } from "@/modules/led/data/logo";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormLogo } from "./form-logo";

export const metadata: Metadata = { title: "Logo sampul LED" };

const fmtWaktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/**
 * Logo sampul LED (D8, desain form 2, 2 Nov 2026): fitur khusus LED (LKPS berupa tabel Excel tanpa sampul), di grup LED
 * menu Admin UPPS. Pratinjau memperlihatkan logo di tengah halaman muka seperti hasil ekspor.
 */
export default async function HalamanLogoSampul() {
  const p = await wajibAdmin();
  const [logo, gambar, fakultas] = await Promise.all([ambilLogo(), logoDataUrl(), ambilFakultas()]);
  return (
    <ShellMenuLed pengguna={p}>
      <JudulHalaman judul="Logo sampul LED" deskripsi="Logo perguruan tinggi di halaman muka semua LED." />
      <Petunjuk
        kunci="admin-logo-sampul"
        fungsi="Saat ekspor Word, kotak “Logo Perguruan Tinggi” di halaman muka template LAM Teknik diganti logo ini, jadi Tim Prodi tidak perlu menyuntingnya di Word."
        langkah={[
          "Unggah logo PNG atau JPEG (latar transparan lebih rapi), minimal 100 × 100 piksel, maksimal 2 MB.",
          "Logo dipakai semua prodi; ekspor LED yang sudah ada tidak berubah sampai diekspor ulang.",
          "Nama perguruan tinggi dan UPPS di bawah logo diatur di Identitas institusi (fitur bersama).",
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo perguruan tinggi</CardTitle>
            <CardDescription>
              {logo ? `${logo.nama} · ${logo.lebar} × ${logo.tinggi} piksel · diperbarui ${fmtWaktu.format(logo.updatedAt)}` : "Belum ada logo. Ekspor masih memakai kotak dari template."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormLogo ada={Boolean(logo)} />
          </CardContent>
        </Card>
        <Card aria-label="Pratinjau halaman muka">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">PRATINJAU HALAMAN MUKA</p>
            <p className="text-xs font-bold">LAPORAN EVALUASI DIRI</p>
            {gambar
              // eslint-disable-next-line @next/next/no-img-element -- data URL kecil dari unggahan sendiri
              ? <img src={gambar} alt="Logo perguruan tinggi" className="size-28 object-contain" />
              : <div className="flex size-28 items-center justify-center rounded-full border-2 border-dashed text-xs text-muted-foreground"><ImageOff className="size-6" aria-hidden /></div>}
            <p className="text-xs font-bold uppercase">{fakultas?.nama ?? "UPPS"}<br />{fakultas?.perguruanTinggi ?? "Perguruan tinggi"}</p>
          </CardContent>
        </Card>
      </div>
    </ShellMenuLed>
  );
}
