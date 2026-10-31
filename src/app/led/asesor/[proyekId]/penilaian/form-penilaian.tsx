"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { formatAngka } from "@/modules/bersama/domain/teks";
import { perluAlasan } from "@/modules/led/domain/review";
import type { penilaianProyek } from "@/modules/led/data/review";
import { aksiPutuskanReview, aksiSimpanSkor } from "@/app/led/aksi-review";

type Data = Awaited<ReturnType<typeof penilaianProyek>>;
type Butir = Data["butir"][number];

const KOSONG = "__kosong__";

function BarisButir({ proyekId, b, bolehUbah }: { proyekId: string; b: Butir; bolehUbah: boolean }) {
  const { sibuk, jalankan } = useAksi();
  const [skor, setSkor] = useState<number | null>(b.skor);
  const [alasan, setAlasan] = useState(b.alasan ?? "");
  const butuhAlasan = skor !== null && perluAlasan(skor, b.skorSistem);
  const simpan = (s: number | null, a: string) => jalankan(() => aksiSimpanSkor(proyekId, b.kode, s, a.trim() || null));
  const pilihan = [4, 3, 2, 1, 0];
  const pilih = (v: string) => {
    const s = v === KOSONG ? null : Number(v);
    setSkor(s);
    // skor berbeda dari sistem: tunggu alasan dulu
    if (s === null || !perluAlasan(s, b.skorSistem) || alasan.trim()) simpan(s, alasan);
  };
  const deskriptor = skor !== null && Number.isInteger(skor) ? b.deskriptor[skor] : null;
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Butir {b.kode} · {b.elemen} · bobot {formatAngka(b.bobot)}</div>
          <div className="text-sm font-medium leading-snug">{b.indikator}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {b.jenis === "angka" && (
            <Badge variant="outline" title="Skor hitungan sistem dari LKPS">sistem: {b.skorSistem === null ? "—" : formatAngka(b.skorSistem)}</Badge>
          )}
          <Select value={skor === null ? KOSONG : String(skor)} onValueChange={pilih} disabled={!bolehUbah || sibuk}>
            <SelectTrigger size="sm" className="w-36" aria-label={`Skor butir ${b.kode}`}><SelectValue /></SelectTrigger>
            <SelectContent className="max-w-md">
              <SelectItem value={KOSONG}>Belum dinilai</SelectItem>
              {b.skorSistem !== null && !Number.isInteger(b.skorSistem) && (
                <SelectItem value={String(b.skorSistem)}>{formatAngka(b.skorSistem)} (hitungan sistem)</SelectItem>
              )}
              {pilihan.map((n) => (
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
      </div>
      {deskriptor && <p className="rounded-md bg-muted/50 px-3 py-2 text-xs whitespace-pre-line text-muted-foreground"><span className="font-medium text-foreground">Deskriptor skor {skor}: </span>{deskriptor}</p>}
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
    </li>
  );
}

export function FormPenilaian({ proyekId, data }: { proyekId: string; data: Data }) {
  const { sibuk, jalankan } = useAksi();
  const [catatan, setCatatan] = useState("");
  const bolehUbah = data.review === "direview";
  const bagian = [...new Set(data.butir.map((b) => b.bagianKode))];
  const syaratLayak = [
    { ok: data.catatanBelumSelesai === 0, teks: data.catatanBelumSelesai ? `${data.catatanBelumSelesai} catatan revisi belum diterima` : "Semua catatan revisi sudah diterima" },
    { ok: data.akhir.lengkap, teks: `${data.akhir.dinilai} dari ${data.akhir.jumlahButir} butir sudah diberi skor` },
  ];
  // instrumen lama (seed) hanya memuat deskriptor skor 4; deskriptor 0-3 terisi dari ekstraksi Matriks Penilaian
  const tanpaDeskriptor = data.butir.every((b) => b.deskriptor.slice(0, 4).every((d) => !d));
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {tanpaDeskriptor && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            Instrumen LED ini hanya memuat deskriptor skor 4. Deskriptor skor 0–3 tersedia bila LED memakai instrumen jenjang yang diekstrak dari
            Matriks Penilaian (menu Instrumen).
          </p>
        )}
        {bagian.map((k) => (
          <section key={k} className="rounded-lg border px-4">
            <h2 className="border-b py-2 font-mono text-sm font-medium">{k}</h2>
            <ul className="divide-y">
              {data.butir.filter((b) => b.bagianKode === k).map((b) => <BarisButir key={b.kode} proyekId={proyekId} b={b} bolehUbah={bolehUbah} />)}
            </ul>
          </section>
        ))}
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-lg border p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nilai akhir (simulasi)</h2>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{formatAngka(data.akhir.total)}</div>
          <div className="text-sm text-muted-foreground">dari {formatAngka(data.akhir.maksimum, 0)} · Σ bobot × skor</div>
          <div className="mt-3 text-sm">Perkiraan status: <span className="font-medium">{data.perkiraan?.status ?? "—"}</span>
            {data.perkiraan?.masaBerlakuTahun ? <span className="text-muted-foreground"> ({data.perkiraan.masaBerlakuTahun} tahun)</span> : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Menurut ambang Pedoman Penilaian; syarat perlu tidak diperiksa. Ini simulasi internal, bukan keputusan LAM.</p>
        </section>
        <section className="flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Keputusan</h2>
          {data.keputusan && data.review !== "direview" && (
            <p className="text-sm">Keputusan terakhir: <span className="font-medium">{data.keputusan.keputusan === "layak" ? "Layak diajukan" : "Perlu revisi"}</span>
              {data.keputusan.catatan && <span className="block text-muted-foreground">{data.keputusan.catatan}</span>}
            </p>
          )}
          <ul className="space-y-1 text-sm">
            {syaratLayak.map((s) => (
              <li key={s.teks} className={s.ok ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{s.ok ? "✓" : "•"} {s.teks}</li>
            ))}
          </ul>
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} placeholder="Catatan umum untuk Tim Prodi (wajib untuk Perlu revisi bila tidak ada catatan terbuka)" disabled={!bolehUbah} aria-label="Catatan keputusan" />
          <TombolKonfirmasi
            pemicu={<Button disabled={!bolehUbah || sibuk || !syaratLayak.every((s) => s.ok)}><CheckCircle2 aria-hidden />Layak diajukan</Button>}
            judul="Nyatakan Layak diajukan?"
            deskripsi={`Nilai simulasi ${formatAngka(data.akhir.total)} (${data.perkiraan?.status ?? "—"}). Tim Prodi diberi tahu dan ekspor Word final terbuka.`}
            labelAksi="Layak diajukan"
            berbahaya={false}
            onKonfirmasi={() => jalankan(() => aksiPutuskanReview(proyekId, "layak", catatan), { sukses: "Dinyatakan Layak diajukan; Tim Prodi diberi tahu." })}
          />
          <Button variant="outline" disabled={!bolehUbah || sibuk} onClick={() => jalankan(() => aksiPutuskanReview(proyekId, "perlu_revisi", catatan), { sukses: "Dinyatakan Perlu revisi; Tim Prodi diberi tahu." })}>
            <RotateCcw aria-hidden />Perlu revisi
          </Button>
          {!bolehUbah && <p className="text-xs text-muted-foreground">Skor dan keputusan bisa diubah saat LED berstatus Direview.</p>}
        </section>
      </aside>
    </div>
  );
}
