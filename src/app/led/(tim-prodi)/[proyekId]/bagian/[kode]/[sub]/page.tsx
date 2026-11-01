import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, Loader2, Plus } from "lucide-react";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { modelAiAktif } from "@/modules/bersama/data/pengaturan";
import { daftarDokumen } from "@/modules/led/data/dokumen";
import { nilaiButirProyek } from "@/modules/led/data/nilai-butir";
import { bacaVarian, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { LABEL_STATUS_SUB, bagianBerikutnya, persenPosisi, peringatanSebelumGenerate, posisiSub, subDigenerate } from "@/modules/led/domain/navigasi";
import { STATUS_BERJALAN } from "@/modules/bersama/tampil";
import { LencanaProses, PemantauProses } from "@/components/status-proses";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TombolGenerate } from "@/modules/led/komponen/narasi/tombol-generate";
import { cn } from "@/modules/bersama/utils";
import { hrefKriteria, hrefSub, muatKriteria } from "../muat";
import { IsianJawaban } from "../isian-jawaban";
import { contohBahanProdi } from "@/modules/led/domain/bahan-prodi";
import { DaftarCek, PanelDraf } from "../panel-draf";
import { KotakMetrik } from "../kotak-metrik";
import { IsianNilaiManual } from "../isian-nilai-manual";
import { IsianTarget } from "../isian-target";
import { capaianButirProyek, type CapaianButir } from "@/modules/led/data/target-butir";
import { teksCapaian, teksTren } from "@/modules/led/domain/capaian";
import { LABEL_TIPE, LencanaStatusSub } from "../lencana-sub";
import { TautanSimpan } from "../tautan-simpan";
import { TabSubBagian } from "../tab-sub";
import { PemilihSub } from "../pemilih-sub";
import { daftarCatatan } from "@/modules/led/data/review";

export async function generateMetadata({ params }: PageProps<"/led/[proyekId]/bagian/[kode]/[sub]">): Promise<Metadata> {
  const { sub } = await params;
  return { title: decodeURIComponent(sub) };
}

function JudulSeksi({ children, aksi }: { children: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</h2>
      {aksi}
    </div>
  );
}

/**
 * Satu sub-bagian satu halaman (revisi 19 Okt 2026). Perbaikan 1 Nov 2026 (P4): kepala halaman dengan Sebelumnya,
 * pemilih sub-bagian ("2 dari 7"), Berikutnya; lalu dua tab: "1. Bahan untuk AI" (instruksi, butir dan daftar cek
 * skor 4, data LKPS/nilai manual/target, Bahan dari prodi, dokumen, Generate narasi) dan "2. Narasi (masuk ke Word)"
 * (editor selebar halaman, baris Periksa dengan panel samping, riwayat versi). Kolom daftar sub-bagian di kanan dihapus.
 */
export default async function HalamanSubBagian({ params }: PageProps<"/led/[proyekId]/bagian/[kode]/[sub]">) {
  const p = await wajibTimProdi();
  const model = await modelAiAktif();
  const { proyekId, kode: kodeMentah, sub: subMentah } = await params;
  const kodeSub = decodeURIComponent(subMentah);
  const d = await muatKriteria(p, proyekId, decodeURIComponent(kodeMentah));
  if (!d) notFound();
  const { proyek, bagian, draf, target, statusSub } = d;
  const s = bagian.subBagian.find((x) => x.kode === kodeSub);
  const posisi = posisiSub(bagian.subBagian.map((x) => x.kode), kodeSub);
  if (!s || !posisi) notFound();

  const [semuaDokumen, nilai, capaian, catatan] = await Promise.all([
    daftarDokumen(p, proyekId), nilaiButirProyek(p, proyekId), capaianButirProyek(p, proyekId), daftarCatatan(p, proyekId, kodeSub),
  ]);
  // panel catatan asesor tampil bila LED punya asesor atau sudah ada catatan (revisi 22 Okt 2026)
  const review = proyek.asesorId || catatan.catatan.length ? { catatan: catatan.catatan, bolehUbah: !proyek.diarsipkanPada } : null;
  const ts = proyek.tsTahunMulai;
  const digenerate = subDigenerate(s.tipe);
  const v = varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang);
  const t = target[s.kode];
  const drafSub = draf[s.kode] ?? null;
  const terunggah = semuaDokumen.filter((x) => x.subBagianKode === s.kode);
  const nilaiButir = new Map(nilai.daftar.map((n) => [n.butir, n]));
  const gambar = semuaDokumen
    .filter((x) => x.jenis === "gambar" && x.status === "siap")
    .map((x) => ({ id: x.id, judul: x.judul ?? x.namaBerkas, src: `/api/led/dokumen/${x.id}/berkas` }));
  const adaProses = terunggah.some((x) => STATUS_BERJALAN.includes(x.status));
  // revisi 22 Okt 2026: teks yang sedang ditulis untuk sub-bagian ini (tampil bertahap, diperbarui berkala)
  const sedangDitulis = d.tugasAktif.map((t) => t.pratinjau[s.kode]).find(Boolean) ?? null;
  const ditulisDiTugas = d.tugasAktif.some((t) => t.status === "berjalan" || t.status === "antre");

  const lanjutBagian = bagianBerikutnya(d.urutanBagian.map((b) => b.kode), bagian.kode);
  const namaLanjutBagian = d.urutanBagian.find((b) => b.kode === lanjutBagian)?.nama;
  const keSebelumnya = posisi.sebelumnya
    ? { href: hrefSub(proyek.id, bagian.kode, posisi.sebelumnya), label: "Sebelumnya" }
    : { href: hrefKriteria(proyek.id, bagian.kode), label: `Ringkasan ${bagian.kode}` };
  const keBerikutnya = posisi.berikutnya
    ? { href: hrefSub(proyek.id, bagian.kode, posisi.berikutnya), label: "Berikutnya" }
    : lanjutBagian
      ? { href: hrefKriteria(proyek.id, lanjutBagian), label: `Berikutnya: ${lanjutBagian}${namaLanjutBagian ? ` ${namaLanjutBagian}` : ""}` }
      : { href: `/led/${proyek.id}/ekspor`, label: "Selesai: ke Ekspor Word" };

  const tombolGenerate = digenerate && (
    <TombolGenerate
      proyekId={proyek.id}
      bagianKode={bagian.kode}
      subBagianKode={s.kode}
      label={drafSub?.aktif ? "Generate ulang" : "Generate"}
      sudahAda={Boolean(drafSub?.aktif)}
      nonaktif={d.tugasAktif.length > 0}
      peringatan={peringatanSebelumGenerate(s.kode, d.jumlahDrafIku)}
      model={model.labelNarasi}
    />
  );

  const adaNarasi = Boolean(drafSub?.aktif);
  const kelasTombolNav = "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium";
  const navigasi = (bawah: boolean) => (
    <nav aria-label={bawah ? "Pindah sub-bagian (bawah)" : "Pindah sub-bagian"} className={cn("flex flex-wrap items-center justify-between gap-2", bawah && "border-t pt-4")}>
      <TautanSimpan href={keSebelumnya.href} className={cn(kelasTombolNav, "border hover:bg-muted")}>
        <ArrowLeft className="size-4" aria-hidden />{keSebelumnya.label}
      </TautanSimpan>
      {bawah
        ? <span className="text-xs text-muted-foreground">{posisi.nomor} dari {posisi.total}</span>
        : (
          <PemilihSub
            kini={s.kode}
            pilihan={bagian.subBagian.map((x) => ({
              kode: x.kode,
              label: `${x.label ? `${x.label} ` : ""}${x.judul}`,
              href: hrefSub(proyek.id, bagian.kode, x.kode),
              status: LABEL_STATUS_SUB[statusSub[x.kode]],
            }))}
          />
        )}
      <TautanSimpan href={keBerikutnya.href} className={cn(kelasTombolNav, "bg-primary text-primary-foreground hover:bg-primary/90")}>
        {keBerikutnya.label}<ArrowRight className="size-4" aria-hidden />
      </TautanSimpan>
    </nav>
  );

  // tab 1: bahan yang dipakai AI (instruksi dan butir terbuka bila narasi belum ada)
  const bahan = (
    <>
      {v && (
        <details className="group rounded-lg border-l-4 border-primary/40 bg-muted/50 p-4 text-sm" open={!adaNarasi} aria-label="Instruksi template">
          <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-muted-foreground">Instruksi template</summary>
          <p className="mt-2 whitespace-pre-line">{gantiLabelTS(v.instruksi, ts)}</p>
          {v.catatanTemplate && <p className="mt-2 text-xs italic text-muted-foreground">{v.catatanTemplate}</p>}
        </details>
      )}

      {s.butir.length > 0 && (
        <details className="rounded-lg border p-4" open={!adaNarasi} aria-label="Butir penilaian">
          <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Butir penilaian dan daftar cek skor 4 · {s.butir.length}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {s.butir.map((b) => (
              <div key={b.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Butir {b.kode} · {b.elemen}</div>
                    <div className="font-medium leading-snug">{gantiLabelTS(b.indikator, ts)}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Badge variant="secondary">bobot {formatAngka(Number(b.bobot))}</Badge>
                    <Badge variant={b.jenis === "angka" ? "default" : "outline"}>{b.jenis}</Badge>
                    {b.tabelLkps.map((tb) => <Badge key={tb} variant="outline" className="font-mono">LKPS {tb}</Badge>)}
                  </div>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer select-none text-xs text-muted-foreground">Deskriptor skor 4 (resmi)</summary>
                  <p className="mt-1 whitespace-pre-line">{gantiLabelTS(b.deskriptorSkor4, ts)}</p>
                </details>
                <DaftarCek
                  butir={[{ kode: b.kode, unsur: b.unsurSkor4.map((u) => gantiLabelTS(u, ts)) }]}
                  unsur={drafSub?.aktif?.unsur ?? []}
                />
                {b.jenis === "angka" && (() => {
                  const n = nilaiButir.get(b.kode);
                  return (
                    <>
                      {(n?.sumber === "rumus" || (n?.kodeRumus && !nilai.adaLkps)) && (
                        <KotakMetrik hasil={n?.sumber === "rumus" ? n.hasil ?? undefined : undefined} perluDicek={nilai.perluDicek} proyekId={proyek.id} />
                      )}
                      {n?.perluManual && (
                        <IsianNilaiManual
                          proyekId={proyek.id}
                          butirKode={b.kode}
                          awal={{ nilai: n.manual?.nilai ?? "", keterangan: n.manual?.keterangan ?? "" }}
                          alasan={n.alasan}
                        />
                      )}
                      <CapaianDanTren c={capaian.get(b.kode)} />
                      <IsianTarget
                        key={`target-${b.kode}`}
                        proyekId={proyek.id}
                        butirKode={b.kode}
                        awal={{
                          target: capaian.get(b.kode)?.target?.target ?? "", satuan: capaian.get(b.kode)?.target?.satuan ?? "",
                          sumber: capaian.get(b.kode)?.target?.sumber ?? "", lebihKecil: capaian.get(b.kode)?.target?.lebihKecil ?? false,
                        }}
                      />
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </details>
      )}

      {!digenerate && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {s.tipe === "data"
            ? "Sub-bagian ini diisi otomatis dari data proyek (LKPS, identitas, tim penyusun) saat ekspor Word."
            : "Sub-bagian ini disusun otomatis oleh sistem saat ekspor Word."}
        </div>
      )}

      {digenerate && (
        <section aria-label="Bahan dari prodi">
          <IsianJawaban key={s.kode} proyekId={proyek.id} subBagianKode={s.kode} awal={d.jawaban[s.kode] ?? ""} contoh={contohBahanProdi(s.kode)} />
        </section>
      )}

      {digenerate && (
        <section aria-label="Dokumen pendukung" className="text-sm">
          {/* revisi 23 Okt 2026: dokumen dikelola di Basis Pengetahuan; di sini hanya daftar dan tautan ke sana */}
          <JudulSeksi
            aksi={!proyek.diarsipkanPada && (
              <TautanSimpan
                href={`/led/${proyek.id}/dokumen/tambah?sub=${encodeURIComponent(s.kode)}&kembali=${encodeURIComponent(hrefSub(proyek.id, bagian.kode, s.kode))}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"
              >
                <Plus className="size-3.5" aria-hidden />Tambah ke Basis Pengetahuan
              </TautanSimpan>
            )}
          >
            Dokumen dari Basis Pengetahuan{terunggah.length > 0 ? ` · ${terunggah.length}` : ""}
          </JudulSeksi>
          {terunggah.length > 0 ? (
            <ul className="space-y-1 rounded-lg border p-3">
              {terunggah.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <FileText className="size-3.5 text-muted-foreground" aria-hidden />
                  <a href={`/api/led/dokumen/${x.id}/berkas`} target="_blank" rel="noreferrer" className="hover:underline">
                    {x.judul ?? x.namaBerkas}
                  </a>
                  {x.bersama && <Badge variant="outline">bersama fakultas</Badge>}
                  <LencanaProses status={x.status} />
                  {x.pesan && <span className="text-destructive">{x.pesan}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Belum ada dokumen yang dikaitkan ke sub-bagian ini. Saat generate, sistem tetap mencari di semua dokumen{" "}
              <TautanSimpan href={`/led/${proyek.id}/dokumen`} className="text-primary underline">Basis Pengetahuan</TautanSimpan>.
            </p>
          )}
        </section>
      )}

      {digenerate && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Bahan di atas dipakai AI untuk menyusun narasi. Hasilnya muncul di tab Narasi dan bisa disunting.
          </p>
          <TombolGenerate
            proyekId={proyek.id}
            bagianKode={bagian.kode}
            subBagianKode={s.kode}
            label={adaNarasi ? "Generate ulang narasi" : "Generate narasi"}
            sudahAda={adaNarasi}
            nonaktif={d.tugasAktif.length > 0}
            peringatan={peringatanSebelumGenerate(s.kode, d.jumlahDrafIku)}
            model={model.labelNarasi}
          />
        </div>
      )}
    </>
  );

  // tab 2: narasi yang masuk ke Word
  const narasi = (
    <>
      {sedangDitulis && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" aria-live="polite">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />Sedang ditulis
          </div>
          <div className="whitespace-pre-line text-muted-foreground">{sedangDitulis}</div>
        </div>
      )}
      <PanelDraf
        key={s.kode}
        proyekId={proyek.id}
        subBagianKode={s.kode}
        draf={drafSub}
        butir={[]}
        gambar={gambar}
        tugasAktif={d.sedangDisusun}
        review={review}
      />
    </>
  );

  return (
    <>
      <PemantauProses aktif={adaProses || ditulisDiTugas} detik={ditulisDiTugas ? 2 : 3} />
      <JudulHalaman
        judul={
          <span className="leading-snug">
            {s.label && <span className="mr-2 font-mono text-muted-foreground">{s.label}</span>}
            {s.judul}
          </span>
        }
        deskripsi={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <span className="font-mono">{bagian.kode}</span> · {posisi.nomor} dari {posisi.total} · {bagian.nama}
            </span>
            <Badge variant="outline">{LABEL_TIPE[s.tipe] ?? s.tipe}</Badge>
            {t != null && <span>target ± {formatAngka(t, 0)} kata</span>}
          </span>
        }
        remah={[
          { label: "Beranda LED", href: `/led/${proyek.id}` },
          { label: bagian.kode, href: hrefKriteria(proyek.id, bagian.kode) },
          { label: s.label || `${posisi.nomor} dari ${posisi.total}` },
        ]}
        aksi={
          <>
            <LencanaStatusSub status={statusSub[s.kode]} />
            {tombolGenerate}
          </>
        }
      />
      {navigasi(false)}
      <Progress value={persenPosisi(posisi)} aria-label={`Sub-bagian ${posisi.nomor} dari ${posisi.total}`} className="h-1.5" />

      {digenerate
        ? <TabSubBagian bahan={bahan} narasi={narasi} adaNarasi={adaNarasi} kunciNarasi={drafSub?.aktif?.id ?? null} />
        : <div className="flex flex-col gap-6">{bahan}</div>}

      {navigasi(true)}
    </>
  );
}

/** Capaian terhadap target dan tren tiga tahun (dihitung sistem). */
function CapaianDanTren({ c }: { c: CapaianButir | undefined }) {
  if (!c || (!c.hasil && c.tren.length === 0)) return null;
  return (
    <div className="rounded-md bg-muted/60 p-3 text-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Evaluasi capaian (dihitung sistem)</div>
      {c.hasil && (
        <p className={c.hasil.tercapai ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}>
          {teksCapaian(c.hasil, c.satuanCapaian ?? c.target?.satuan ?? null)}{c.target?.sumber ? ` · target dari ${c.target.sumber}` : ""}
        </p>
      )}
      {c.tren.map((t) => <p key={t.judul} className="text-muted-foreground">{teksTren(t)}</p>)}
    </div>
  );
}
