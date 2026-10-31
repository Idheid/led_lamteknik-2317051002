import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { prisma } from "@/modules/bersama/db";
import { ambilButir, pilihanSubBagian } from "@/modules/led/data/instrumen";
import { JENJANG, namaJenjang, type KodeJenjang } from "@/modules/bersama/domain/jenjang";
import type { MasukanButir } from "@/modules/led/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormButir } from "../form-butir";

export const metadata: Metadata = { title: "Butir penilaian" };

export default async function HalamanUbahButir({ params, searchParams }: PageProps<"/led/instrumen/[versiId]/butir/[butirId]">) {
  const p = await wajibAdmin();
  const { versiId, butirId } = await params;
  const q = await searchParams;
  const versi = await prisma.versiInstrumen.findUnique({
    where: { id: versiId },
    include: { _count: { select: { proyek: true } }, bagian: { where: { jenis: { in: ["kriteria", "butir"] } }, orderBy: { urutan: "asc" }, select: { kode: true } } },
  });
  if (!versi) notFound();
  const sub = await pilihanSubBagian(p, versiId);
  const pilihanSub = sub.map((s) => ({ id: s.id, kode: s.kode, label: s.label, judul: s.judul, bagian: s.bagian.kode }));

  let jenjang: KodeJenjang;
  let awal: MasukanButir;
  if (butirId === "baru") {
    jenjang = (JENJANG.find((j) => j.kode === q.jenjang)?.kode ?? "S1") as KodeJenjang;
    const terakhir = await prisma.butirPenilaian.aggregate({ where: { versiId, jenjang }, _max: { urutan: true, no: true } });
    awal = {
      jenjang, kode: "", no: (terakhir._max.no ?? 0) + 1, sub: "", urutan: (terakhir._max.urutan ?? 0) + 1,
      bagianKode: versi.bagian[0]?.kode ?? "", elemen: "", indikator: "", bobot: 0, jenis: "narasi", tabelLkps: [],
      deskriptorSkor4: "", unsurSkor4: [], subBagianIds: [], catatan: "",
    };
  } else {
    const b = await ambilButir(p, butirId);
    if (!b || b.versiId !== versiId) notFound();
    jenjang = b.jenjang as KodeJenjang;
    awal = {
      jenjang, kode: b.kode, no: b.no, sub: b.sub ?? "", urutan: b.urutan, bagianKode: b.bagianKode, elemen: b.elemen,
      indikator: b.indikator, bobot: Number(b.bobot), jenis: b.jenis, tabelLkps: b.tabelLkps,
      deskriptorSkor4: b.deskriptorSkor4, unsurSkor4: b.unsurSkor4,
      subBagianIds: b.subBagian.map((r) => r.subBagianId),
      catatan: b.catatan ?? "",
    };
  }
  const baru = butirId === "baru";
  return (
    <>
      <JudulHalaman
        judul={baru ? `Butir baru (${namaJenjang(jenjang)})` : `Butir ${awal.kode} · ${awal.elemen}`}
        remah={[
          { label: "Instrumen", href: "/led/instrumen" },
          { label: versi.kode, href: `/led/instrumen/${versiId}` },
          { label: `Butir ${jenjang}`, href: `/led/instrumen/${versiId}/butir?jenjang=${jenjang}` },
          { label: baru ? "Baru" : awal.kode },
        ]}
      />
      <Petunjuk
        kunci="admin-butir-ubah"
        fungsi="Formulir satu butir penilaian. Unsur skor 4 dipakai sebagai daftar cek kelengkapan narasi; dokumen pendukung dipakai daftar cek dokumen."
        langkah={[
          "Isi deskriptor skor 4 dan pecah menjadi unsur yang bisa dicek satu per satu.",
          "Pilih tabel LKPS terkait dan sub-bagian tempat butir dibahas, lalu simpan.",
        ]}
      />
      <FormButir
        versiId={versiId}
        id={baru ? undefined : butirId}
        jenjang={jenjang}
        awal={awal}
        pilihanSub={pilihanSub}
        bagianKode={versi.bagian.map((b) => b.kode)}
        terkunci={versi._count.proyek > 0}
      />
    </>
  );
}
