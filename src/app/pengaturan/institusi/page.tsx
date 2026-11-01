import type { Metadata } from "next";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { ShellBersama } from "@/components/shell/shell-bersama";
import { FormInstitusi } from "./form-institusi";

export const metadata: Metadata = { title: "Identitas institusi" };

/**
 * Identitas institusi (D7, desain form 2, 2 Nov 2026): data perguruan tinggi dan UPPS yang sama untuk semua prodi. Fitur
 * bersama: dipakai identitas pengusul LED dan sheet Menu LKPS. Logo sampul (khusus LED) ada di menu LED.
 */
export default async function HalamanInstitusi() {
  const p = await wajibAdmin();
  const f = await ambilFakultas();
  return (
    <ShellBersama pengguna={p}>
      <JudulHalaman judul="Identitas institusi" deskripsi="Perguruan tinggi dan UPPS, diisi sekali untuk semua program studi." />
      <Petunjuk
        kunci="admin-institusi"
        fungsi="Data ini dipakai bersama LED (halaman muka dan identitas pengusul) dan LKPS (sheet Menu: perguruan tinggi, UPPS, status PT, alamat, kota, kode pos, telepon). Tim Prodi tidak perlu mengisinya lagi."
        langkah={[
          "Periksa nama perguruan tinggi dan UPPS, lalu pilih status perguruan tinggi.",
          "Lengkapi alamat, kode pos, telepon, dan SK pendirian perguruan tinggi.",
          "Logo perguruan tinggi untuk sampul LED diunggah di menu LED (tombol LED), karena hanya dipakai LED.",
        ]}
      />
      <FormInstitusi
        awal={{
          nama: f?.nama ?? "",
          perguruanTinggi: f?.perguruanTinggi ?? "",
          statusPt: (f?.statusPt ?? "") as never,
          alamat: f?.alamat ?? "",
          kota: f?.kota ?? "",
          kodePos: f?.kodePos ?? "",
          telepon: f?.telepon ?? "",
          skPendirian: f?.skPendirian ?? "",
          tanggalSkPendirian: f?.tanggalSkPendirian ?? "",
          pejabatSkPendirian: f?.pejabatSkPendirian ?? "",
        }}
      />
    </ShellBersama>
  );
}
