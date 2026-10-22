import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarProdi } from "@/lib/data/organisasi";
import { instrumenAktifUntuk } from "@/lib/data/proyek";
import { namaJenjang } from "@/lib/domain/instrumen";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormProyekBaru, type PilihanProdiLed } from "../form-proyek-baru";

export const metadata: Metadata = { title: "Buat LED baru" };

/** Revisi 23 Okt 2026: LED baru dibuat di halaman sendiri (bukan formulir di samping daftar Semua LED). */
export default async function HalamanLedBaru({ searchParams }: PageProps<"/proyek/baru">) {
  const p = await wajibPenanggungJawab();
  const { prodi: prodiDipilih } = await searchParams;
  const prodi = await daftarProdi(p);
  const tahunIni = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()));
  // pilihan prodi: nonaktif bila masih ada LED aktif atau instrumen jenjangnya belum aktif
  const instrumen = new Map<string, boolean>();
  for (const j of new Set(prodi.map((x) => x.jenjang))) instrumen.set(j, Boolean(await instrumenAktifUntuk(j)));
  const pilihan: PilihanProdiLed[] = prodi.map((x) => ({
    id: x.id,
    nama: x.nama,
    jenjang: x.jenjang,
    alasan: x.proyek.some((l) => !l.diarsipkanPada)
      ? "masih ada LED aktif"
      : !instrumen.get(x.jenjang) ? `instrumen ${namaJenjang(x.jenjang)} belum aktif` : null,
  }));
  return (
    <ShellDaftarProyek pengguna={p}>
      <HalamanTambah
        judul="Buat LED baru"
        remah={[{ label: "Semua LED", href: "/proyek" }, { label: "Buat LED baru" }]}
        kembali="/proyek"
        catatan="Satu LED = satu pengajuan akreditasi satu prodi (berlaku 5 tahun). Instrumen dipilih otomatis menurut jenjang prodi."
      >
        <FormProyekBaru prodi={pilihan} tahunUsulan={tahunIni} awalProdiId={typeof prodiDipilih === "string" ? prodiDipilih : undefined} />
      </HalamanTambah>
    </ShellDaftarProyek>
  );
}
