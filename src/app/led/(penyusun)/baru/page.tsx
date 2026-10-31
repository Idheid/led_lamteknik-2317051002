import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { daftarProdi } from "@/modules/bersama/data/organisasi";
import { instrumenAktifUntuk } from "@/modules/led/data/proyek";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormProyekBaru, type PilihanProdiLed } from "../form-proyek-baru";

export const metadata: Metadata = { title: "Buat LED baru" };

/** Revisi 23 Okt 2026: LED baru dibuat di halaman sendiri (bukan formulir di samping daftar Semua LED). */
export default async function HalamanLedBaru({ searchParams }: PageProps<"/led/baru">) {
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
    <ShellMenuLed pengguna={p}>
      <HalamanTambah
        judul="Buat LED baru"
        remah={[{ label: "Semua LED", href: "/led" }, { label: "Buat LED baru" }]}
        kembali="/led"
        catatan="Satu LED = satu pengajuan akreditasi satu prodi (berlaku 5 tahun). Instrumen dipilih otomatis menurut jenjang prodi."
      >
        <FormProyekBaru prodi={pilihan} tahunUsulan={tahunIni} awalProdiId={typeof prodiDipilih === "string" ? prodiDipilih : undefined} />
      </HalamanTambah>
    </ShellMenuLed>
  );
}
