"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, CircleAlert, CircleCheck, CircleDashed, CircleHelp, FileWarning, GitCompareArrows, History, ListChecks,
  MessageSquareText, PenLine, RotateCcw, ShieldCheck,
} from "lucide-react";
import type { DrafSubBagian } from "@/modules/led/data/generate";
import type { HasilPemeriksaan, PotonganDiff } from "@/modules/led/domain/narasi";
import type { KeluaranSubBagian } from "@/modules/led/domain/prompt";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { EditorNarasi, type GambarProyek } from "@/modules/led/komponen/narasi/editor-narasi";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/modules/bersama/utils";
import { aksiBandingkanVersi, aksiPeriksaDenganAi, aksiPulihkanVersi, aksiTandaiSubBagian } from "@/app/led/(tim-prodi)/aksi";
import { LABEL_KALIMAT, kunciKalimat, ringkasVerifikasi, teksRingkas, type KalimatTerperiksa, type LabelKalimat } from "@/modules/led/domain/verifikasi";
import type { HasilVerifikasiAi } from "@/modules/led/data/verifikasi";
import type { CatatanTampil } from "@/modules/led/data/review";
import { PanelCatatan, keSorotan, useCatatanLangsung } from "@/modules/led/komponen/review/panel-catatan";
import { LABEL_BAHAN_PRODI } from "@/modules/led/domain/bahan-prodi";
import { BarisPeriksa, type ItemPeriksa } from "@/modules/led/komponen/narasi/panel-samping";

export interface ButirCek {
  kode: string;
  unsur: string[];
}

const LABEL_ASAL: Record<string, string> = { generate: "Generate", sunting: "Suntingan", pulihkan: "Dipulihkan" };

function waktu(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

// ------------------------------------------------------------------ pemeriksaan otomatis

function Baris({ ok, judul, children }: { ok: boolean; judul: string; children?: ReactNode }) {
  return (
    <li className="flex gap-2">
      {ok
        ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="lolos" />
        : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="perlu dicek" />}
      <div className="min-w-0">
        <div className="font-medium">{judul}</div>
        {children && <div className="text-xs text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ verifikasi per kalimat (revisi 22 Okt 2026)

const GAYA_LABEL: Record<LabelKalimat, string> = {
  sesuai: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  sebagian: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  tidak_didukung: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
};

function PanelVerifikasi({
  proyekId, subBagianKode, kalimat, ai,
}: { proyekId: string; subBagianKode: string; kalimat: KalimatTerperiksa[]; ai: HasilVerifikasiAi | null }) {
  const { sibuk, jalankan } = useAksi();
  const [hanyaMasalah, setHanyaMasalah] = useState(true);
  if (kalimat.length === 0) return null;
  const r = ringkasVerifikasi(kalimat);
  const tampil = hanyaMasalah ? kalimat.filter((k) => k.label !== "sesuai") : kalimat;
  return (
    <section aria-label="Verifikasi per kalimat" className="rounded-lg border p-3 text-sm">
      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Verifikasi per kalimat</h4>
      <p className="mb-2">{teksRingkas(r)}</p>
      <p className="mb-2 text-xs text-muted-foreground">
        {ai ? `Diperiksa AI (${ai.model}), ${waktu(ai.waktu)}.` : "Cek otomatis: angka dan kata kunci dicocokkan dengan sumber yang dirujuk."}
      </p>
      <label className="mb-2 flex items-center gap-2 text-xs">
        <Switch checked={hanyaMasalah} onCheckedChange={setHanyaMasalah} />Hanya kalimat bermasalah
      </label>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {tampil.map((k, i) => (
          <li key={i} className="text-xs">
            <Badge variant="outline" className={cn("mb-0.5", GAYA_LABEL[k.label])}>{LABEL_KALIMAT[k.label]}</Badge>
            <p className="line-clamp-3">{k.teks}</p>
            <p className="text-muted-foreground">{k.alasan}</p>
          </li>
        ))}
        {tampil.length === 0 && <li className="text-xs text-muted-foreground">Semua kalimat sesuai sumber.</li>}
      </ul>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        disabled={sibuk}
        onClick={() => jalankan(() => aksiPeriksaDenganAi(proyekId, subBagianKode), {
          lalu: (h) => toast.success(`Selesai diperiksa AI: ${teksRingkas(h)}.`),
        })}
      >
        {sibuk ? <IkonSibuk sibuk /> : <ShieldCheck aria-hidden />}Periksa dengan AI
      </Button>
    </section>
  );
}

function PanelPemeriksaan({ h }: { h: (HasilPemeriksaan & { catatanSistem?: string[] }) | null }) {
  if (!h) return null;
  const min = h.target ? Math.round(h.target * 0.85) : null;
  const maks = h.target ? Math.round(h.target * 1.15) : null;
  const sumberMasalah = h.masalahSumber.filter((m) => m.jenis !== "unsur_hilang");
  const unsurHilang = h.masalahSumber.filter((m) => m.jenis === "unsur_hilang");
  return (
    <section aria-label="Pemeriksaan otomatis" className="rounded-lg border p-3 text-sm">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pemeriksaan otomatis</h4>
      <ul className="space-y-2.5">
        <Baris
          ok={h.panjang === "pas"}
          judul={h.panjang === "pas" ? "Panjang sesuai anggaran" : h.panjang === "kurang" ? "Terlalu pendek" : "Terlalu panjang"}
        >
          {formatAngka(h.jumlahKata, 0)} kata{h.target ? `; target ${formatAngka(h.target, 0)} (rentang ${formatAngka(min!, 0)}–${formatAngka(maks!, 0)})` : ""}
        </Baris>
        <Baris ok={h.angkaTidakBerdasar.length === 0} judul={h.angkaTidakBerdasar.length === 0 ? "Semua angka berasal dari data" : "Angka tanpa dasar data"}>
          {h.angkaTidakBerdasar.length > 0 && <>Periksa: {h.angkaTidakBerdasar.join(", ")}. Hapus atau lengkapi sumbernya di LKPS, Bahan dari prodi, atau dokumen.</>}
        </Baris>
        <Baris ok={sumberMasalah.length === 0} judul={sumberMasalah.length === 0 ? "Setiap paragraf punya sumber" : "Masalah sumber"}>
          {sumberMasalah.length > 0 && <ul className="list-disc pl-4">{sumberMasalah.slice(0, 5).map((m, i) => <li key={i}>{m.pesan}</li>)}</ul>}
        </Baris>
        <Baris ok={h.belumAdaBukti.length === 0} judul={h.belumAdaBukti.length === 0 ? "Tidak ada penanda belum ada bukti" : `${h.belumAdaBukti.length} penanda [BELUM ADA BUKTI]`}>
          {h.belumAdaBukti.length > 0 && <>Lengkapi bukti lalu generate ulang, atau sunting penandanya: {h.belumAdaBukti.join("; ")}.</>}
        </Baris>
        {unsurHilang.length > 0 && (
          <Baris ok={false} judul="Status unsur tidak lengkap">{unsurHilang.map((m) => m.pesan).join(" ")}</Baris>
        )}
      </ul>
      {h.catatanSistem && h.catatanSistem.length > 0 && (
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{h.catatanSistem.join(" ")}</p>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ daftar cek skor 4

const IKON_UNSUR = {
  terpenuhi: { ikon: CheckCircle2, kelas: "text-emerald-600", label: "Terpenuhi" },
  sebagian: { ikon: CircleDashed, kelas: "text-amber-600", label: "Sebagian" },
  belum_ada_bukti: { ikon: CircleAlert, kelas: "text-rose-600", label: "Belum ada bukti" },
} as const;

export function DaftarCek({ butir, unsur }: { butir: ButirCek[]; unsur: KeluaranSubBagian["unsur"] }) {
  if (butir.length === 0) return null;
  return (
    <section aria-label="Daftar cek skor 4" className="rounded-lg border p-3 text-sm">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Daftar cek unsur skor 4</h4>
      <div className="space-y-3">
        {butir.map((b) => (
          <div key={b.kode}>
            {butir.length > 1 && <div className="mb-1 text-xs font-medium">Butir {b.kode}</div>}
            <ul className="space-y-1.5">
              {b.unsur.map((u, i) => {
                const x = unsur.find((y) => y.butir === b.kode && (y.unsur.startsWith(`(${i + 1})`) || y.unsur.includes(u.slice(0, 20))));
                const g = x ? IKON_UNSUR[x.status] : null;
                const Ikon = g?.ikon ?? CircleHelp;
                return (
                  <li key={i} className="flex gap-2">
                    <Ikon className={cn("mt-0.5 size-4 shrink-0", g?.kelas ?? "text-muted-foreground")} aria-hidden />
                    <div className="min-w-0">
                      <span>{u}</span>
                      <span className={cn("ml-1 text-xs", g?.kelas ?? "text-muted-foreground")}>
                        · {g?.label ?? "belum dinilai"}
                        {x?.sumber && x.sumber.length > 0 && <span className="font-mono text-muted-foreground"> ({x.sumber.join(", ")})</span>}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ riwayat versi

function RiwayatVersi({ proyekId, draf }: { proyekId: string; draf: NonNullable<DrafSubBagian> }) {
  const { sibuk, jalankan } = useAksi();
  const [membandingkan, mulai] = useTransition();
  const v = draf.versi;
  const [lama, setLama] = useState(v[1]?.id ?? "");
  const [baru, setBaru] = useState(v[0]?.id ?? "");
  const [hasil, setHasil] = useState<{ lama: number; baru: number; potongan: PotonganDiff[] } | null>(null);
  const bandingkan = () => mulai(async () => {
    const r = await aksiBandingkanVersi(lama, baru);
    if (!r.ok) {
      toast.error(r.pesan);
      return;
    }
    setHasil({ lama: r.data.lama.nomor, baru: r.data.baru.nomor, potongan: r.data.potongan });
  });
  const pilihan = v.map((x) => (
    <SelectItem key={x.id} value={x.id}>Versi {x.nomor} · {LABEL_ASAL[x.asal] ?? x.asal}</SelectItem>
  ));
  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border text-sm">
        {v.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <span className="w-16 font-medium tabular-nums">Versi {x.nomor}</span>
            <Badge variant={x.asal === "generate" ? "secondary" : "outline"}>{LABEL_ASAL[x.asal] ?? x.asal}</Badge>
            {x.aktif && <Badge className="border-transparent bg-primary/10 text-primary">Aktif</Badge>}
            <span className="text-muted-foreground">{waktu(x.dibuat)}</span>
            <span className="text-muted-foreground">{x.oleh ?? (x.asal === "generate" ? x.model : "—")}</span>
            <span className="text-muted-foreground tabular-nums">{formatAngka(x.jumlahKata, 0)} kata</span>
            {!x.aktif && (
              <span className="ml-auto">
                <TombolKonfirmasi
                  pemicu={<Button variant="outline" size="sm" disabled={sibuk}><RotateCcw aria-hidden />Pulihkan</Button>}
                  judul={`Pulihkan versi ${x.nomor}?`}
                  deskripsi="Isi versi ini disalin menjadi versi baru dan menjadi versi aktif. Versi lain tetap tersimpan di riwayat."
                  labelAksi="Pulihkan"
                  berbahaya={false}
                  onKonfirmasi={() => jalankan(() => aksiPulihkanVersi(proyekId, x.id), {
                    lalu: (d) => toast.success(`Versi ${d.dariNomor} dipulihkan sebagai versi ${d.nomor}.`),
                  })}
                />
              </span>
            )}
          </li>
        ))}
      </ul>
      {v.length > 1 && (
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Versi lama
              <Select value={lama} onValueChange={setLama}>
                <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{pilihan}</SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Versi baru
              <Select value={baru} onValueChange={setBaru}>
                <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{pilihan}</SelectContent>
              </Select>
            </label>
            <Button size="sm" onClick={bandingkan} disabled={membandingkan || !lama || !baru || lama === baru}>
              {membandingkan ? <IkonSibuk sibuk /> : <GitCompareArrows aria-hidden />}
              Bandingkan
            </Button>
          </div>
          {hasil && (
            <div className="mt-3">
              <p className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Versi {hasil.lama} → versi {hasil.baru}</span>
                <span><del className="rounded-sm bg-rose-50 px-0.5 text-rose-700 decoration-rose-500 dark:bg-rose-950/40 dark:text-rose-300">dicoret</del> = dihapus</span>
                <span><ins className="rounded-sm bg-amber-100 px-0.5 no-underline dark:bg-amber-900/40">disorot</ins> = ditambahkan</span>
              </p>
              <div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm leading-relaxed">
                {hasil.potongan.every((x) => x.jenis === "sama")
                  ? <span className="text-muted-foreground">Kedua versi sama.</span>
                  : hasil.potongan.map((x, i) => x.jenis === "sama"
                    ? <span key={i}>{x.teks}</span>
                    : x.jenis === "hapus"
                      ? <del key={i} className="rounded-sm bg-rose-50 text-rose-700 decoration-rose-500 dark:bg-rose-950/40 dark:text-rose-300">{x.teks}</del>
                      : <ins key={i} className="rounded-sm bg-amber-100 no-underline dark:bg-amber-900/40">{x.teks}</ins>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ panel utama

/** Jumlah hal yang perlu dicek di panel Pemeriksaan otomatis. */
function jumlahMasalah(h: (HasilPemeriksaan & { catatanSistem?: string[] }) | null): number {
  if (!h) return 0;
  return [
    h.panjang !== "pas",
    h.angkaTidakBerdasar.length > 0,
    h.masalahSumber.some((m) => m.jenis !== "unsur_hilang"),
    h.belumAdaBukti.length > 0,
    h.masalahSumber.some((m) => m.jenis === "unsur_hilang"),
  ].filter(Boolean).length;
}

/**
 * Tab "Narasi (masuk ke Word)" satu sub-bagian (perbaikan 1 Nov 2026, P4): editor selebar halaman, info versi dan model,
 * baris Periksa (Catatan asesor, Pemeriksaan, Verifikasi) yang membuka panel samping, pita kuning bila ada catatan asesor
 * terbuka, lalu keterangan kode sumber dan Riwayat versi.
 */
export function PanelDraf({
  proyekId, subBagianKode, draf, butir, gambar, tugasAktif, review,
}: {
  proyekId: string;
  subBagianKode: string;
  draf: DrafSubBagian | null;
  butir: ButirCek[];
  gambar: GambarProyek[];
  tugasAktif: boolean;
  /** revisi 22 Okt 2026: catatan asesor (null bila LED belum punya asesor dan belum ada catatan) */
  review: { catatan: CatatanTampil[]; bolehUbah: boolean } | null;
}) {
  const aktif = draf?.aktif ?? null;
  const { catatan, muat } = useCatatanLangsung(proyekId, subBagianKode, review?.catatan ?? []);
  const [catatanAktif, setCatatanAktif] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const sorotan = useMemo(() => keSorotan(catatan, catatanAktif), [catatan, catatanAktif]);
  const pilihCatatan = (id: string) => {
    setCatatanAktif(id);
    setPanel("catatan");
    setTimeout(() => document.getElementById(`catatan-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 250);
  };
  // revisi 26 Okt 2026: dibuka dari Beranda (…#catatan-<id>): catatan itu disorot di panel dan di narasi
  useEffect(() => {
    const m = /^#catatan-(.+)$/.exec(window.location.hash);
    if (!m) return;
    const t = setTimeout(() => {
      setCatatanAktif(m[1]);
      setPanel("catatan");
      setTimeout(() => document.getElementById(`catatan-${m[1]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }, 300);
    return () => clearTimeout(t);
  }, []);
  const [periksa, setPeriksa] = useState<(HasilPemeriksaan & { catatanSistem?: string[] }) | null>(null);
  // label kalimat: hasil Periksa dengan AI bila ada (dan belum disunting), selain itu cek otomatis
  const ai = periksa ? null : aktif?.pemeriksaan?.kalimatAi ?? null;
  const kalimatTampil = useMemo(() => ai?.hasil ?? (periksa ?? aktif?.pemeriksaan)?.kalimat ?? [], [ai, periksa, aktif]);
  const labelKalimat = useMemo(() => Object.fromEntries(kalimatTampil.map((k) => [kunciKalimat(k.teks), k.label])), [kalimatTampil]);
  const [manual, setManual] = useState(false);
  const { sibuk, jalankan } = useAksi();
  // editor dimuat ulang hanya bila ada versi dasar baru (generate atau pulihkan), bukan setiap simpan otomatis
  const dasar = draf?.versi.find((v) => v.asal !== "sunting")?.id ?? "manual";
  const hasilPeriksa = periksa ?? aktif?.pemeriksaan ?? null;
  const catatanTerbuka = catatan.filter((c) => c.status === "terbuka").length;
  const catatanBelumSelesai = catatan.filter((c) => c.status !== "diterima").length;
  const kalimatBermasalah = kalimatTampil.filter((k) => k.label !== "sesuai").length;

  const item: ItemPeriksa[] = [
    ...(review ? [{
      kunci: "catatan", label: "Catatan asesor", jumlah: catatanBelumSelesai, perhatian: catatanTerbuka > 0,
      ikon: <MessageSquareText aria-hidden />, keterangan: "Klik catatan untuk menyorot kalimatnya di narasi.",
      isi: <PanelCatatan catatan={catatan} peran="PJ" bolehUbah={review.bolehUbah} aktif={catatanAktif} onPilih={(id) => setCatatanAktif(id)} muat={muat} />,
    }] : []),
    ...(hasilPeriksa ? [{
      kunci: "pemeriksaan", label: "Pemeriksaan", jumlah: jumlahMasalah(hasilPeriksa), perhatian: jumlahMasalah(hasilPeriksa) > 0,
      ikon: <ListChecks aria-hidden />, keterangan: "Panjang, angka, sumber, dan penanda belum ada bukti.",
      isi: (
        <>
          <PanelPemeriksaan h={hasilPeriksa} />
          <DaftarCek butir={butir} unsur={aktif?.unsur ?? []} />
          {aktif && aktif.dokumenKurang.length > 0 && (
            <section className="rounded-lg border p-3 text-sm">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FileWarning className="size-3.5" aria-hidden />Dokumen yang perlu diunggah
              </h4>
              <ul className="list-disc space-y-0.5 pl-4">{aktif.dokumenKurang.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </section>
          )}
          {aktif?.catatanPenyusun && (
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Catatan sistem: </span>{aktif.catatanPenyusun}</p>
          )}
        </>
      ),
    }] : []),
    ...(kalimatTampil.length > 0 ? [{
      kunci: "verifikasi", label: "Verifikasi", jumlah: kalimatBermasalah, perhatian: kalimatBermasalah > 0,
      ikon: <ShieldCheck aria-hidden />, keterangan: "Setiap kalimat dicocokkan dengan sumber yang dirujuk.",
      isi: <PanelVerifikasi proyekId={proyekId} subBagianKode={subBagianKode} kalimat={kalimatTampil} ai={ai} />,
    }] : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {aktif
            ? <>
              Versi {aktif.nomor} · {LABEL_ASAL[aktif.asal] ?? aktif.asal} · {waktu(aktif.dibuat)}
              {aktif.model && ` · ${aktif.model}`}
              {aktif.pemakaian && ` · ${formatAngka(aktif.pemakaian.tokenMasuk, 0)} token masuk, ${formatAngka(aktif.pemakaian.tokenKeluar, 0)} token keluar`}
            </>
            : "Narasi inilah yang masuk ke Word."}
        </p>
        {aktif && (
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draf?.status === "selesai"}
              disabled={sibuk}
              onCheckedChange={(v) => jalankan(() => aksiTandaiSubBagian(proyekId, subBagianKode, v), {
                sukses: v ? "Ditandai selesai." : "Tanda selesai dibatalkan.",
              })}
            />
            Selesai
          </label>
        )}
      </div>

      {!aktif && !manual ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>
            {tugasAktif
              ? "Sub-bagian ini ada di antrean penyusunan. Draf muncul di sini setelah selesai."
              : "Belum ada draf. Lengkapi tab Bahan untuk AI, lalu klik Generate narasi."}
          </p>
          <Button variant="link" size="sm" onClick={() => setManual(true)}><PenLine aria-hidden />Tulis manual</Button>
        </div>
      ) : (
        <>
          {review && catatanTerbuka > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/40" role="status">
              <span>{catatanTerbuka} catatan asesor belum diperbaiki.</span>
              <Button size="sm" variant="outline" onClick={() => setPanel("catatan")}><MessageSquareText aria-hidden />Lihat catatan</Button>
            </div>
          )}
          <BarisPeriksa item={item} buka={panel} onBuka={setPanel} />
          <EditorNarasi
            key={dasar}
            proyekId={proyekId}
            subBagianKode={subBagianKode}
            isi={aktif?.isi ?? null}
            gambar={gambar}
            onTersimpan={(h) => {
              setPeriksa(h.pemeriksaan);
              // jangkar catatan diperiksa ulang terhadap versi baru (penanda "teks asli berubah")
              if (review) void muat();
            }}
            labelKalimat={labelKalimat}
            catatan={sorotan}
            onKlikCatatan={pilihCatatan}
          />
          {aktif && Object.keys(aktif.legenda).length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Keterangan kode sumber</summary>
              <dl className="mt-1 grid gap-x-3 gap-y-0.5 sm:grid-cols-[auto_1fr]">
                {Object.entries(aktif.legenda).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="font-mono text-primary/80">{k}</dt>
                    <dd>{k === "J" ? LABEL_BAHAN_PRODI : v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </>
      )}

      {draf && draf.versi.length > 0 && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" aria-hidden />Riwayat versi ({draf.versi.length})
          </summary>
          <div className="mt-3"><RiwayatVersi proyekId={proyekId} draf={draf} /></div>
        </details>
      )}
    </div>
  );
}
