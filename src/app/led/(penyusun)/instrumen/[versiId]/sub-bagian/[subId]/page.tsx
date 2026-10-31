import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { prisma } from "@/modules/bersama/db";
import { bacaVarian, jenjangBerlaku } from "@/modules/led/domain/instrumen";
import { KODE_JENJANG, type KodeJenjang } from "@/modules/bersama/domain/jenjang";
import type { MasukanSubBagian } from "@/modules/led/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormSubBagian } from "../form-sub-bagian";

export const metadata: Metadata = { title: "Sub-bagian" };

const sahJenjang = (x: string[]): KodeJenjang[] => x.filter((k): k is KodeJenjang => (KODE_JENJANG as string[]).includes(k));

export default async function HalamanSubBagian({ params, searchParams }: PageProps<"/led/instrumen/[versiId]/sub-bagian/[subId]">) {
  await wajibPenanggungJawab();
  const { versiId, subId } = await params;
  const { bagian: bagianQuery } = await searchParams;
  const baru = subId === "baru";

  let bagianId: string;
  let awal: MasukanSubBagian;
  let judul: string;
  if (baru) {
    if (typeof bagianQuery !== "string") notFound();
    const b = await prisma.bagian.findFirst({ where: { id: bagianQuery, versiId }, include: { _count: { select: { subBagian: true } } } });
    if (!b) notFound();
    bagianId = b.id;
    judul = "Sub-bagian baru";
    awal = {
      kode: `${b.kode}-`, label: "", judul: "", grup: "", tipe: b.jenis === "kriteria" ? "iku" : "narasi",
      urutan: b._count.subBagian + 1, varian: [{ instruksi: "", jenjang: [...KODE_JENJANG], catatanTemplate: "" }],
      berlakuUntuk: [...KODE_JENJANG], catatan: "",
    };
  } else {
    const s = await prisma.subBagian.findFirst({ where: { id: subId, bagian: { versiId } } });
    if (!s) notFound();
    bagianId = s.bagianId;
    judul = `${s.label ? `${s.label} ` : ""}${s.judul}`;
    awal = {
      kode: s.kode, label: s.label, judul: s.judul, grup: s.grup ?? "", tipe: s.tipe, urutan: s.urutan,
      varian: bacaVarian(s.varian).map((v) => ({ instruksi: v.instruksi, jenjang: sahJenjang(v.jenjang), catatanTemplate: v.catatanTemplate ?? "" })),
      berlakuUntuk: sahJenjang(jenjangBerlaku(s)), catatan: s.catatan ?? "",
    };
  }
  const bagian = await prisma.bagian.findUniqueOrThrow({
    where: { id: bagianId },
    include: { versi: { select: { kode: true, _count: { select: { proyek: true } } } } },
  });
  return (
    <>
      <JudulHalaman
        judul={judul}
        deskripsi={baru ? undefined : <span className="font-mono">{awal.kode}</span>}
        remah={[
          { label: "Instrumen", href: "/led/instrumen" },
          { label: bagian.versi.kode, href: `/led/instrumen/${versiId}` },
          { label: bagian.kode, href: `/led/instrumen/${versiId}/bagian/${bagianId}` },
          { label: baru ? "Baru" : awal.kode },
        ]}
      />
      <Petunjuk
        kunci="admin-sub-bagian"
        fungsi="Formulir sub-bagian: kode, judul, pertanyaan pemandu, dan butir yang dibahas. Isian ini menjadi bagian prompt penyusunan narasi."
        langkah={[
          "Isi atau perbaiki pertanyaan pemandu supaya penanggung jawab tahu apa yang perlu dijawab.",
          "Simpan, lalu kembali ke halaman bagian.",
        ]}
      />
      <FormSubBagian
        versiId={versiId}
        bagianId={bagianId}
        id={baru ? undefined : subId}
        awal={awal}
        terkunci={bagian.versi._count.proyek > 0}
      />
    </>
  );
}
