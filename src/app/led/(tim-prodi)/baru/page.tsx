import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import { daftarProyek, instrumenAktifUntuk } from "@/modules/led/data/proyek";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { usulanBatasPengajuan } from "@/modules/led/domain/kesiapan";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormProyekBaru } from "../form-proyek-baru";

export const metadata: Metadata = { title: "Buat LED baru" };

/** LED baru untuk prodi akun Tim Prodi (revisi 31 Okt 2026). */
export default async function HalamanLedBaru() {
  const p = await wajibTimProdi();
  const [prodi, proyek] = await Promise.all([ambilProdi(p, p.prodiId), daftarProyek(p)]);
  if (!prodi) redirect("/");
  const tahunIni = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()));
  // TS bawaan dihitung dari usulan batas pengajuan (6 bulan sebelum akreditasi berakhir), atau hari ini bila belum ada
  const tanggalAcuan = prodi.akreditasiBerlakuSampai ? usulanBatasPengajuan(prodi.akreditasiBerlakuSampai) : new Date();
  const alasan = proyek.some((l) => !l.diarsipkanPada)
    ? "Prodi ini masih punya LED aktif. Arsipkan LED itu dulu dari Pengaturan LED."
    : !(await instrumenAktifUntuk(prodi.jenjang)) ? `Instrumen ${namaJenjang(prodi.jenjang)} belum aktif. Hubungi Admin UPPS.` : null;
  return (
    <ShellMenuLed pengguna={p}>
      <HalamanTambah
        judul="Buat LED baru"
        remah={[{ label: "LED", href: "/led" }, { label: "Buat LED baru" }]}
        kembali="/led"
        catatan="Satu LED = satu pengajuan akreditasi satu prodi. Pilih TS sesuai data LKPS yang dipakai; instrumen dipilih otomatis menurut jenjang prodi."
      >
        <FormProyekBaru prodi={{ nama: prodi.nama, jenjang: prodi.jenjang, alasan }} tahunUsulan={tahunIni} tanggalAcuan={tanggalAcuan.toISOString()} />
      </HalamanTambah>
    </ShellMenuLed>
  );
}
