import type { Metadata } from "next";
import Link from "next/link";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { daftarDokumen, daftarDokumenBersama, pilihanSubBagianBersama } from "@/lib/data/dokumen";
import { pilihanSubBagianProyek } from "@/lib/data/proyek";
import { daftarKunci } from "@/lib/data/kunci-api";
import { pakaiPenyediaUji } from "@/lib/llm/embedding";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { PemantauProses } from "@/components/status-proses";
import { STATUS_BERJALAN } from "@/lib/tampil";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabelDokumen } from "@/components/basis-pengetahuan/tabel-dokumen";
import { PanelCari } from "./panel-cari";
import { UnggahDokumenUmum } from "./unggah-umum";

export const metadata: Metadata = { title: "Basis Pengetahuan" };

/**
 * Basis Pengetahuan (revisi 22 Okt 2026): menu Dokumen dan Dokumen bersama fakultas digabung menjadi satu menu dengan
 * dua tab, ditambah lihat potongan, kolom tahun, dan uji cari (8 potongan yang diberikan ke AI beserta skornya).
 */
export default async function HalamanBasisPengetahuan({ params, searchParams }: PageProps<"/proyek/[proyekId]/dokumen">) {
  const p = await wajibPenanggungJawab();
  const { proyekId } = await params;
  const tab = (await searchParams).tab === "bersama" ? "bersama" : "led";
  const [semua, bersama, pilihan, pilihanBersama, kunci] = await Promise.all([
    daftarDokumen(p, proyekId), daftarDokumenBersama(p), pilihanSubBagianProyek(p, proyekId), pilihanSubBagianBersama(p), daftarKunci(p),
  ]);
  const milikLed = semua.filter((d) => !d.bersama);
  const namaSub = new Map(pilihan.map((s) => [s.kode, s.label]));
  const namaSubBersama = new Map(pilihanBersama.map((s) => [s.kode, s.label]));
  const berjalan = semua.some((d) => STATUS_BERJALAN.includes(d.status));
  const menungguKunci = semua.filter((d) => d.status === "menunggu_kunci").length;
  const tanpaKunci = kunci.length === 0 && !pakaiPenyediaUji();
  const siap = semua.filter((d) => d.status === "siap" && d.jenis !== "gambar");
  const potongan = siap.reduce((a, d) => a + d.jumlahPotongan, 0);
  const dasar = `/proyek/${proyekId}/dokumen`;
  const kelasTab = (aktif: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${aktif ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <>
      <PemantauProses aktif={berjalan} />
      <JudulHalaman
        judul="Basis Pengetahuan"
        deskripsi={`Dokumen rujukan yang dipotong dan diindeks (vektor + kata kunci). Saat generate, 8 potongan paling relevan diberikan ke AI sehingga narasi ditulis dari isi dokumen prodi. Siap dicari: ${siap.length} dokumen, ${potongan.toLocaleString("id-ID")} potongan.`}
        remah={[{ label: "Beranda", href: `/proyek/${proyekId}` }, { label: "Basis Pengetahuan" }]}
      />
      <Petunjuk
        kunci="proyek-dokumen"
        fungsi="Dokumen pendukung (PDF, DOCX, gambar) yang menjadi sumber narasi: dokumen LED ini dan dokumen bersama fakultas (dipakai semua LED)."
        langkah={[
          "Unggah dokumen lalu pilih sub-bagian terkait agar mudah ditemukan saat generate.",
          "Tunggu status Siap; klik angka potongan untuk melihat teks yang terbaca.",
          "Isi tahun terbit (untuk rujukan Word) dan tautan bukti (wajib sebelum ekspor final).",
          "Pakai Uji cari untuk mengecek apakah bukti sudah terbaca sebelum generate.",
        ]}
      />
      {(tanpaKunci || menungguKunci > 0) && (
        <Alert>
          <AlertTitle>{tanpaKunci ? "Belum ada kunci API Gemini" : `${menungguKunci} dokumen menunggu kunci API`}</AlertTitle>
          <AlertDescription>
            Dokumen teks butuh kunci API untuk dibuat embedding-nya. Tambahkan kunci di menu Kunci API; dokumen yang tertahan
            akan diproses ulang otomatis.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uji cari</CardTitle>
          <CardDescription>
            Ketik pertanyaan, atau pilih sub-bagian lalu pakai kueri generate-nya. Hasilnya adalah 8 potongan yang akan diberikan ke AI,
            diurutkan menurut skor gabungan vektor dan kata kunci (reciprocal rank fusion, k = 60).
            {siap.length === 0 && " Belum ada dokumen yang siap dicari."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PanelCari proyekId={proyekId} pilihan={pilihan} />
        </CardContent>
      </Card>

      <nav className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1" aria-label="Tab Basis Pengetahuan">
        <Link href={dasar} className={kelasTab(tab === "led")} aria-current={tab === "led" ? "page" : undefined}>
          Dokumen LED ini ({milikLed.length})
        </Link>
        <Link href={`${dasar}?tab=bersama`} className={kelasTab(tab === "bersama")} aria-current={tab === "bersama" ? "page" : undefined}>
          Dokumen bersama fakultas ({bersama.length})
        </Link>
      </nav>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tab === "led" ? "Unggah dokumen LED" : "Unggah dokumen bersama"}</CardTitle>
            <CardDescription>
              {tab === "led"
                ? "Biasanya diunggah dari halaman sub-bagian agar langsung terkait butirnya. Di sini untuk dokumen umum LED ini."
                : "Dipakai semua LED di fakultas (kode sumber U1, U2, …): VMTS UPPS, Renstra, SK organisasi, SPMI, laporan keuangan."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tab === "led"
              ? <UnggahDokumenUmum proyekId={proyekId} pilihan={pilihan} />
              : <UnggahDokumenUmum pilihan={pilihanBersama} url="/api/dokumen-bersama" />}
          </CardContent>
        </Card>
        <Card className="py-0 xl:col-span-2">
          <CardContent className="overflow-x-auto px-0">
            {tab === "led"
              ? <TabelDokumen dokumen={milikLed} namaSub={namaSub} proyekId={proyekId} bolehUbah />
              : <TabelDokumen dokumen={bersama} namaSub={namaSubBersama} proyekId="" bolehUbah />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
