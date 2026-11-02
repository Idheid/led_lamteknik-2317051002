"use client";

import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { nilaiButir, perkiraanStatus, perluAlasan, persenNilai, rekapPenilaian, skorTerpakai } from "@/modules/led/domain/review";
import type { penilaianProyek } from "@/modules/led/data/review";
import { NarasiBaca } from "@/modules/led/komponen/narasi/narasi-baca";
import { aksiMulaiSkorRubrik, aksiPutuskanReview, aksiSimpanSkor } from "@/app/led/aksi-review";
import { cn } from "@/modules/bersama/utils";

type Data = Awaited<ReturnType<typeof penilaianProyek>>;
type Butir = Data["butir"][number];
/** asesor: memberi skor dan keputusan; tim: Tim Prodi melihat perkiraan dan menghitung usulan AI; baca: Admin UPPS. */
export type ModePenilaian = "asesor" | "tim" | "baca";

const KOSONG = "__kosong__";

function teksSkor(s: number | null): string {
  return s === null ? "—" : formatAngka(s);
}

/** Ringkasan besar di atas halaman: total, persentase, perkiraan status, jumlah dinilai, batang nilai per kriteria. */
function Ringkasan({ data, rekap, perkiraan }: { data: Data; rekap: Data["rekap"]; perkiraan: Data["perkiraanGabungan"] }) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs lg:grid-cols-[18rem_minmax(0,1fr)]" aria-label="Ringkasan penilaian">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total nilai</span>
        <span className="text-4xl font-semibold tabular-nums">{formatAngka(rekap.total)}</span>
        <span className="text-sm text-muted-foreground">dari {formatAngka(rekap.maksimum, 0)} · {formatAngka(rekap.persen)}%</span>
        <span className="mt-2 text-sm">Perkiraan status: <span className="font-semibold">{perkiraan?.status ?? "—"}</span>
          {perkiraan?.masaBerlakuTahun ? <span className="text-muted-foreground"> ({perkiraan.masaBerlakuTahun} tahun)</span> : null}
        </span>
        <span className="text-sm text-muted-foreground">{rekap.dinilai} dari {rekap.jumlahButir} butir punya skor</span>
        <span className="mt-2 text-xs text-muted-foreground">
          Skor asesor bila ada, selain itu skor otomatis (sistem untuk butir angka, AI untuk butir narasi). Perkiraan, bukan
          nilai resmi LAM Teknik.
        </span>
      </div>
      <div className="flex flex-col gap-2" aria-label="Nilai per kriteria">
        {rekap.perKriteria.map((k) => (
          <div key={k.bagianKode} className="grid grid-cols-[3rem_minmax(0,1fr)_7rem] items-center gap-2 text-sm">
            <span className="font-mono text-xs">{k.bagianKode}</span>
            <div className="h-3 overflow-hidden rounded-full bg-muted" title={data.namaKriteria[k.bagianKode] ?? k.bagianKode}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, k.persen)}%` }} />
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{formatAngka(k.nilai)} / {formatAngka(k.maksimum, 0)} · {formatAngka(k.persen)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PilihSkor({ proyekId, b, skor, onUbah, bolehUbah }: {
  proyekId: string; b: Butir; skor: number | null; onUbah: (s: number | null) => void; bolehUbah: boolean;
}) {
  const { sibuk, jalankan } = useAksi();
  const [alasan, setAlasan] = useState(b.alasan ?? "");
  const butuhAlasan = skor !== null && perluAlasan(skor, b.skorSistem);
  const simpan = (s: number | null, a: string) => jalankan(() => aksiSimpanSkor(proyekId, b.kode, s, a.trim() || null));
  const pilih = (v: string) => {
    const s = v === KOSONG ? null : Number(v);
    onUbah(s);
    // skor berbeda dari sistem: tunggu alasan dulu
    if (s === null || !perluAlasan(s, b.skorSistem) || alasan.trim()) simpan(s, alasan);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={skor === null ? KOSONG : String(skor)} onValueChange={pilih} disabled={!bolehUbah || sibuk}>
          <SelectTrigger size="sm" className="w-40" aria-label={`Skor asesor butir ${b.kode}`}>
            {/* tampilkan angkanya saja; deskriptor lengkap ada di daftar pilihan dan di baris yang dibuka */}
            <SelectValue>{skor === null ? "Belum dinilai" : `Skor ${formatAngka(skor)}`}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-md">
            <SelectItem value={KOSONG}>Belum dinilai</SelectItem>
            {b.skorSistem !== null && !Number.isInteger(b.skorSistem) && (
              <SelectItem value={String(b.skorSistem)}>{formatAngka(b.skorSistem)} (hitungan sistem)</SelectItem>
            )}
            {[4, 3, 2, 1, 0].map((n) => (
              <SelectItem key={n} value={String(n)} className="items-start">
                <span className="flex flex-col">
                  <span className="font-medium">Skor {n}{b.skorSistem === n ? " (hitungan sistem)" : ""}</span>
                  <span className="line-clamp-3 text-xs text-muted-foreground">{b.deskriptor[n] ?? "Deskriptor belum ada di instrumen."}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IkonSibuk sibuk={sibuk} />
      </div>
      {butuhAlasan && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Alasan skor berbeda dari hitungan sistem"
            aria-label={`Alasan skor butir ${b.kode}`}
            className="h-8 min-w-60 flex-1"
            disabled={!bolehUbah}
          />
          <Button size="sm" variant="outline" disabled={!bolehUbah || sibuk || !alasan.trim()} onClick={() => simpan(skor, alasan)}>Simpan alasan</Button>
        </div>
      )}
    </div>
  );
}

/** Satu baris butir: ringkas di tabel, bisa dibuka untuk membaca narasi terkait, deskriptor, dan alasan AI. */
function BarisButir({ proyekId, b, data, mode, skorAsesor, onUbah, bolehUbah }: {
  proyekId: string; b: Butir; data: Data; mode: ModePenilaian; skorAsesor: number | null; onUbah: (s: number | null) => void; bolehUbah: boolean;
}) {
  const [buka, setBuka] = useState(false);
  const s = skorTerpakai(skorAsesor, b.skorOtomatis);
  const nilai = s === null ? null : nilaiButir(b.bobot, s);
  const deskriptorTerpilih = s !== null ? b.deskriptor[Math.round(s)] : null;
  return (
    <>
      <tr className={cn("border-t align-top", buka && "bg-muted/30")}>
        <td className="py-2.5 pl-3 pr-2">
          <button type="button" onClick={() => setBuka(!buka)} aria-expanded={buka} className="flex w-full items-start gap-2 text-left">
            <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", buka && "rotate-180")} aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Butir {b.kode} · {b.elemen}{b.jenis === "angka" ? " · angka" : ""}</span>
              <span className="block text-sm font-medium leading-snug">{b.indikator}</span>
            </span>
          </button>
        </td>
        <td className="px-2 py-2.5 text-right tabular-nums">{formatAngka(b.bobot)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums">
          {teksSkor(b.skorOtomatis)}
          {b.sumberOtomatis && <span className="block text-[11px] text-muted-foreground">{b.sumberOtomatis === "ai" ? "AI" : "sistem"}{b.usulan?.perluUlang ? " · narasi berubah" : ""}</span>}
        </td>
        <td className="px-2 py-2.5">
          {mode === "asesor"
            ? <PilihSkor proyekId={proyekId} b={b} skor={skorAsesor} onUbah={onUbah} bolehUbah={bolehUbah} />
            : <span className="tabular-nums">{teksSkor(skorAsesor)}</span>}
        </td>
        <td className="px-2 py-2.5 text-right tabular-nums">{nilai === null ? "—" : formatAngka(nilai)}</td>
        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums">{nilai === null ? "—" : `${formatAngka(persenNilai(nilai, b.bobot * 4))}%`}</td>
      </tr>
      {buka && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-3 pb-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex flex-col gap-3">
                {b.sub.length === 0 && <p className="text-sm text-muted-foreground">Butir ini tidak terkait sub-bagian narasi.</p>}
                {b.sub.map((sb) => (
                  <section key={sb.kode} className="rounded-lg border bg-background p-3">
                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">{sb.bagianKode} · {`${sb.label ?? ""} ${sb.judul}`.trim()}</h4>
                    <NarasiBaca isi={data.narasi[sb.kode] ?? null} />
                  </section>
                ))}
              </div>
              <aside className="flex flex-col gap-3 text-sm">
                {deskriptorTerpilih && (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-xs font-medium text-muted-foreground">Deskriptor skor {Math.round(s!)}</div>
                    <p className="mt-1 whitespace-pre-line">{deskriptorTerpilih}</p>
                  </div>
                )}
                {b.usulan && (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5" aria-hidden />Usulan AI: skor {formatAngka(b.usulan.skor)}</div>
                    <p className="mt-1">{b.usulan.alasan}</p>
                    {b.usulan.unsurKurang.length > 0 && (
                      <>
                        <div className="mt-2 text-xs font-medium text-muted-foreground">Unsur skor 4 yang kurang</div>
                        <ul className="mt-1 list-disc pl-4 text-xs">{b.usulan.unsurKurang.map((u) => <li key={u}>{u}</li>)}</ul>
                      </>
                    )}
                    {b.usulan.perluUlang && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Narasi berubah sejak usulan ini dibuat. Hitung ulang usulan skor.</p>}
                  </div>
                )}
                {!b.usulan && b.jenis !== "angka" && <p className="text-xs text-muted-foreground">Belum ada usulan AI untuk butir ini.</p>}
                {b.alasan && <p className="text-xs"><span className="font-medium">Alasan asesor:</span> {b.alasan}</p>}
              </aside>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Keputusan({ proyekId, data, total, bolehUbah }: { proyekId: string; data: Data; total: { nilai: number; dinilai: number; status: string | null }; bolehUbah: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const [catatan, setCatatan] = useState("");
  const syaratLayak = [
    { ok: data.catatanBelumSelesai === 0, teks: data.catatanBelumSelesai ? `${data.catatanBelumSelesai} catatan revisi belum diterima` : "Semua catatan revisi sudah diterima" },
    { ok: total.dinilai === data.butir.length && data.butir.length > 0, teks: `${total.dinilai} dari ${data.butir.length} butir sudah diberi skor asesor` },
  ];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border p-5" aria-label="Keputusan review">
      <h2 className="text-sm font-semibold">Keputusan</h2>
      {data.keputusan && data.review !== "direview" && (
        <p className="text-sm">Keputusan terakhir: <span className="font-medium">{data.keputusan.keputusan === "layak" ? "Layak diajukan" : "Perlu revisi"}</span>
          {data.keputusan.catatan && <span className="block text-muted-foreground">{data.keputusan.catatan}</span>}
        </p>
      )}
      <p className="text-sm">Nilai asesor: <span className="font-medium tabular-nums">{formatAngka(total.nilai)}</span> ({total.status ?? "—"})</p>
      <ul className="space-y-1 text-sm">
        {syaratLayak.map((s) => (
          <li key={s.teks} className={s.ok ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{s.ok ? "✓" : "•"} {s.teks}</li>
        ))}
      </ul>
      <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} placeholder="Catatan umum untuk Tim Prodi (wajib untuk Perlu revisi bila tidak ada catatan terbuka)" disabled={!bolehUbah} aria-label="Catatan keputusan" />
      <div className="flex flex-wrap gap-2">
        <TombolKonfirmasi
          pemicu={<Button disabled={!bolehUbah || sibuk || !syaratLayak.every((s) => s.ok)}><CheckCircle2 aria-hidden />Layak diajukan</Button>}
          judul="Nyatakan Layak diajukan?"
          deskripsi={`Nilai asesor ${formatAngka(total.nilai)} (${total.status ?? "—"}). Tim Prodi diberi tahu dan ekspor Word final terbuka.`}
          labelAksi="Layak diajukan"
          berbahaya={false}
          onKonfirmasi={() => jalankan(() => aksiPutuskanReview(proyekId, "layak", catatan), { sukses: "Dinyatakan Layak diajukan; Tim Prodi diberi tahu." })}
        />
        <Button variant="outline" disabled={!bolehUbah || sibuk} onClick={() => jalankan(() => aksiPutuskanReview(proyekId, "perlu_revisi", catatan), { sukses: "Dinyatakan Perlu revisi; Tim Prodi diberi tahu." })}>
          <RotateCcw aria-hidden />Perlu revisi
        </Button>
      </div>
      {!bolehUbah && <p className="text-xs text-muted-foreground">Skor dan keputusan bisa diubah saat LED berstatus Direview.</p>}
    </section>
  );
}

/** Tombol Tim Prodi: hitung (ulang) usulan skor rubrik lewat antrean. */
function TombolHitung({ proyekId, status, pesan }: { proyekId: string; status: string | null; pesan: string | null }) {
  const { sibuk, jalankan } = useAksi();
  const berjalan = status === "antre" || status === "berjalan";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => jalankan(() => aksiMulaiSkorRubrik(proyekId), { sukses: "Usulan skor sedang dihitung di latar." })} disabled={sibuk || berjalan}>
        <IkonSibuk sibuk={sibuk || berjalan} /><Calculator aria-hidden />Hitung usulan skor
      </Button>
      {berjalan && <span className="text-sm text-muted-foreground">Sedang dihitung{pesan ? ` (${pesan})` : ""}. Muat ulang halaman untuk melihat hasil terbaru.</span>}
      {status === "menunggu_kunci" && <span className="text-sm text-amber-700 dark:text-amber-300">{pesan ?? "Menunggu kunci API."} Hubungi Admin UPPS.</span>}
      {status === "gagal" && <span className="text-sm text-destructive">Gagal: {pesan}</span>}
    </div>
  );
}

/**
 * Halaman Penilaian (revisi 31 Okt 2026, Pak Tris: penilaian "di depan", skor otomatis dari rubrik dan skor reviewer,
 * narasi tampil di form, bobot × skor dan totalnya). Dipakai asesor (memberi skor dan keputusan), Tim Prodi (Perkiraan
 * nilai, menghitung usulan AI), dan Admin UPPS (hanya baca). Total dihitung ulang langsung saat asesor memilih skor.
 */
export function HalamanPenilaian({ proyekId, data, mode }: { proyekId: string; data: Data; mode: ModePenilaian }) {
  const [asesor, setAsesor] = useState(() => new Map(data.butir.map((b) => [b.kode, b.skor])));
  const bolehUbah = mode === "asesor" && data.review === "direview";
  const { rekap, perkiraan, nilaiAsesor } = useMemo(() => {
    const terpakai = new Map<string, number>();
    const hanyaAsesor = new Map<string, number>();
    for (const b of data.butir) {
      const sa = asesor.get(b.kode) ?? null;
      const s = skorTerpakai(sa, b.skorOtomatis);
      if (s !== null) terpakai.set(b.kode, s);
      if (sa !== null) hanyaAsesor.set(b.kode, sa);
    }
    const r = rekapPenilaian(data.butir, terpakai);
    const ra = rekapPenilaian(data.butir, hanyaAsesor);
    return {
      rekap: r,
      perkiraan: r.dinilai ? perkiraanStatus(r.total, data.aturan) : null,
      nilaiAsesor: { nilai: ra.total, dinilai: ra.dinilai, status: ra.dinilai ? perkiraanStatus(ra.total, data.aturan)?.status ?? null : null },
    };
  }, [asesor, data]);
  const kriteria = [...new Set(data.butir.map((b) => b.bagianKode))];
  const tanpaDeskriptor = data.butir.every((b) => b.deskriptor.slice(0, 4).every((d) => !d));
  return (
    <div className="flex flex-col gap-6">
      <Ringkasan data={data} rekap={rekap} perkiraan={perkiraan} />
      {mode === "tim" && <TombolHitung proyekId={proyekId} status={data.skorRubrik.status} pesan={data.skorRubrik.pesan} />}
      {tanpaDeskriptor && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          Instrumen LED ini hanya memuat deskriptor skor 4. Deskriptor skor 0–3 tersedia bila LED memakai instrumen jenjang yang diekstrak dari
          Matriks Penilaian (menu Instrumen).
        </p>
      )}
      {kriteria.map((k) => {
        const r = rekap.perKriteria.find((x) => x.bagianKode === k);
        return (
          <section key={k} className="overflow-hidden rounded-2xl border">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
              <h2 className="text-sm font-semibold"><span className="mr-2 font-mono">{k}</span>{data.namaKriteria[k] ?? ""}</h2>
              {r && <Badge variant="outline" className="tabular-nums">{formatAngka(r.nilai)} / {formatAngka(r.maksimum, 0)} · {formatAngka(r.persen)}%</Badge>}
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pl-3 pr-2 text-left font-medium">Butir</th>
                    <th className="w-16 px-2 py-2 text-right font-medium">Bobot</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">Skor otomatis</th>
                    <th className="w-44 px-2 py-2 text-left font-medium">Skor asesor</th>
                    <th className="w-20 px-2 py-2 text-right font-medium">Nilai</th>
                    <th className="w-20 py-2 pl-2 pr-3 text-right font-medium">Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {data.butir.filter((b) => b.bagianKode === k).map((b) => (
                    <BarisButir
                      key={b.kode}
                      proyekId={proyekId}
                      b={b}
                      data={data}
                      mode={mode}
                      skorAsesor={asesor.get(b.kode) ?? null}
                      onUbah={(s) => setAsesor((m) => new Map(m).set(b.kode, s))}
                      bolehUbah={bolehUbah}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {mode === "asesor" && <Keputusan proyekId={proyekId} data={data} total={nilaiAsesor} bolehUbah={bolehUbah} />}
      {mode !== "asesor" && data.keputusan && (
        <p className="rounded-lg border p-4 text-sm">
          Keputusan asesor: <span className="font-medium">{data.keputusan.keputusan === "layak" ? "Layak diajukan" : "Perlu revisi"}</span>
          {data.keputusan.catatan && <span className="block text-muted-foreground">{data.keputusan.catatan}</span>}
        </p>
      )}
    </div>
  );
}
