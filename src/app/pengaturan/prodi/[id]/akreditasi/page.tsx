import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { prisma } from "@/modules/bersama/db";
import { syaratCatatHasil } from "@/modules/led/data/akreditasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormHasilAkreditasi } from "@/modules/led/komponen/akreditasi/form-hasil-akreditasi";

export const metadata: Metadata = { title: "Catat hasil akreditasi" };

/** Admin UPPS mencatat hasil akreditasi prodi (L1): langsung berlaku; LED yang dipilih diarsipkan. */
export default async function HalamanCatatAkreditasi({ params, searchParams }: PageProps<"/pengaturan/prodi/[id]/akreditasi">) {
  const p = await wajibAdmin();
  const { id } = await params;
  const { led } = (await searchParams) as { led?: string };
  const prodi = await ambilProdi(p, id);
  if (!prodi) notFound();
  const aktif = await prisma.proyekLED.findMany({ where: { prodiId: prodi.id, diarsipkanPada: null }, orderBy: { createdAt: "desc" } });
  const layak = [];
  for (const l of aktif) if ((await syaratCatatHasil(l)).boleh) layak.push({ id: l.id, label: `${l.nama} (pengajuan ${l.tahunPengajuan})` });
  const urut = led ? [...layak.filter((x) => x.id === led), ...layak.filter((x) => x.id !== led)] : layak;
  return (
    <>
      <JudulHalaman
        judul="Catat hasil akreditasi"
        deskripsi={`${namaJenjang(prodi.jenjang)} ${prodi.nama}`}
        remah={[{ label: "Program studi", href: "/pengaturan/prodi" }, { label: prodi.nama, href: `/pengaturan/prodi/${prodi.id}` }, { label: "Catat hasil akreditasi" }]}
      />
      <Petunjuk
        kunci="admin-hasil-akreditasi"
        fungsi="Sumber tanggal akreditasi berakhir prodi. Dicatat Admin UPPS langsung berlaku; LED yang diajukan diarsipkan otomatis."
        langkah={[
          "Pilih LED yang diajukan (bila ada) dan PDF SK, lalu klik Isi dari PDF SK. Periksa isian yang ditandai \"dari SK\".",
          "Bila polanya tidak dikenali, isi manual atau klik Baca dengan AI (memakai token).",
          "Simpan. Riwayat akreditasi prodi bertambah dan pengingat LED periode berikutnya memakai tanggal ini.",
        ]}
      />
      <FormHasilAkreditasi prodiId={prodi.id} pilihanLed={urut} admin kembaliKe={`/pengaturan/prodi/${prodi.id}`} />
    </>
  );
}
