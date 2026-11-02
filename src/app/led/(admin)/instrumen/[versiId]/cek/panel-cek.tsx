"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronRight, CircleDot, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { cn } from "@/modules/bersama/utils";
import { aksiAktifkanVersiCek, aksiKonfirmasiButir, aksiSimpanButirCek } from "../../aksi";

export interface ButirTampil {
  id: string;
  kode: string;
  no: number;
  sub: string | null;
  urutan: number;
  bagianKode: string;
  elemen: string;
  indikator: string;
  bobot: number;
  jenis: "narasi" | "angka";
  tabelLkps: string[];
  deskriptorSkor4: string;
  deskriptorSkor3: string | null;
  deskriptorSkor2: string | null;
  deskriptorSkor1: string | null;
  deskriptorSkor0: string | null;
  unsurSkor4: string[];
  kodeRumus: string | null;
  subBagianIds: string[];
  dikonfirmasi: boolean;
  usulanAi: string[];
  catatan: string | null;
}

export interface SubTampil {
  id: string;
  kode: string;
  judul: string;
  bagianKode: string;
}

const TANPA_RUMUS = "__tanpa";

function Usulan({ aktif }: { aktif: boolean }) {
  if (!aktif) return null;
  return (
    <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <Sparkles className="size-3" aria-hidden />usulan AI
    </Badge>
  );
}

const kotakUsulan = "rounded-md ring-2 ring-amber-300/70 dark:ring-amber-700/70";

function FormButir({
  versiId, jenjang, b, sub, rumus, bagian, terkunci, onSelesai,
}: {
  versiId: string;
  jenjang: string;
  b: ButirTampil;
  sub: SubTampil[];
  rumus: { kode: string; judul: string; rumus: string | null }[];
  bagian: string[];
  terkunci: boolean;
  onSelesai: () => void;
}) {
  const { sibuk, jalankan } = useAksi();
  const [n, setN] = useState({
    kode: b.kode, no: String(b.no), sub: b.sub ?? "", bagianKode: b.bagianKode, elemen: b.elemen, indikator: b.indikator,
    bobot: String(b.bobot).replace(".", ","), jenis: b.jenis, tabelLkps: b.tabelLkps.join(", "), kodeRumus: b.kodeRumus ?? TANPA_RUMUS,
    s4: b.deskriptorSkor4, s3: b.deskriptorSkor3 ?? "", s2: b.deskriptorSkor2 ?? "", s1: b.deskriptorSkor1 ?? "", s0: b.deskriptorSkor0 ?? "",
    subBagianIds: b.subBagianIds, catatan: b.catatan ?? "",
  });
  const [cari, setCari] = useState("");
  const ubah = <K extends keyof typeof n>(k: K, v: (typeof n)[K]) => setN((x) => ({ ...x, [k]: v }));
  const tandai = (kolom: string) => !b.dikonfirmasi && b.usulanAi.includes(kolom);
  const pilihanSub = sub.filter((s) => n.subBagianIds.includes(s.id) || (cari.trim()
    ? `${s.kode} ${s.judul}`.toLowerCase().includes(cari.trim().toLowerCase())
    : s.bagianKode === n.bagianKode));

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    jalankan(() => aksiSimpanButirCek(versiId, b.id, {
      jenjang: jenjang as "S1", kode: n.kode.trim(), no: n.no, sub: n.sub, urutan: b.urutan, bagianKode: n.bagianKode,
      elemen: n.elemen, indikator: n.indikator, bobot: n.bobot.replace(",", "."), jenis: n.jenis,
      tabelLkps: n.tabelLkps.split(",").map((x) => x.trim()).filter(Boolean),
      deskriptorSkor4: n.s4, deskriptorSkor3: n.s3, deskriptorSkor2: n.s2, deskriptorSkor1: n.s1, deskriptorSkor0: n.s0,
      kodeRumus: n.kodeRumus === TANPA_RUMUS ? "" : n.kodeRumus, unsurSkor4: [], subBagianIds: n.subBagianIds, catatan: n.catatan,
    }), { sukses: `Butir ${n.kode} disimpan dan ditandai sudah dicek.`, lalu: onSelesai });
  }

  return (
    <form onSubmit={simpan} className="flex flex-col gap-4 border-t bg-muted/20 p-4 text-sm" noValidate>
      {b.catatan && !b.dikonfirmasi && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">{b.catatan}</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field><FieldLabel htmlFor={`k-${b.id}`}>Kode</FieldLabel><Input id={`k-${b.id}`} value={n.kode} onChange={(e) => ubah("kode", e.target.value)} className="font-mono" disabled={terkunci} /></Field>
        <Field><FieldLabel htmlFor={`no-${b.id}`}>No</FieldLabel><Input id={`no-${b.id}`} value={n.no} onChange={(e) => ubah("no", e.target.value)} inputMode="numeric" disabled={terkunci} /></Field>
        <Field><FieldLabel htmlFor={`sub-${b.id}`}>Sub</FieldLabel><Input id={`sub-${b.id}`} value={n.sub} onChange={(e) => ubah("sub", e.target.value)} placeholder="I, II" disabled={terkunci} /></Field>
        <Field>
          <FieldLabel htmlFor={`bobot-${b.id}`} className="flex items-center gap-2">Bobot <Usulan aktif={tandai("bobot")} /></FieldLabel>
          <Input id={`bobot-${b.id}`} value={n.bobot} onChange={(e) => ubah("bobot", e.target.value)} inputMode="decimal" className={cn(tandai("bobot") && kotakUsulan)} disabled={terkunci} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`el-${b.id}`} className="flex items-center gap-2">Elemen <Usulan aktif={tandai("elemen")} /></FieldLabel>
        <Input id={`el-${b.id}`} value={n.elemen} onChange={(e) => ubah("elemen", e.target.value)} className={cn(tandai("elemen") && kotakUsulan)} disabled={terkunci} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`ind-${b.id}`} className="flex items-center gap-2">Indikator <Usulan aktif={tandai("indikator")} /></FieldLabel>
        <Textarea id={`ind-${b.id}`} rows={2} value={n.indikator} onChange={(e) => ubah("indikator", e.target.value)} className={cn(tandai("indikator") && kotakUsulan)} disabled={terkunci} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`jenis-${b.id}`} className="flex items-center gap-2">Jenis <Usulan aktif={tandai("jenis")} /></FieldLabel>
          <Select value={n.jenis} onValueChange={(v) => ubah("jenis", v as "narasi" | "angka")} disabled={terkunci}>
            <SelectTrigger id={`jenis-${b.id}`} className={cn("w-full", tandai("jenis") && kotakUsulan)}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="narasi">narasi</SelectItem><SelectItem value="angka">angka</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`rumus-${b.id}`} className="flex items-center gap-2">Rumus lama <Usulan aktif={tandai("kodeRumus")} /></FieldLabel>
          <Select value={n.kodeRumus} onValueChange={(v) => ubah("kodeRumus", v)} disabled={terkunci || n.jenis !== "angka"}>
            <SelectTrigger id={`rumus-${b.id}`} className={cn("w-full", tandai("kodeRumus") && kotakUsulan)}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TANPA_RUMUS}>Tanpa rumus (nilai diisi manual)</SelectItem>
              {rumus.map((r) => <SelectItem key={r.kode} value={r.kode}>{r.kode} · {r.judul}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldDescription>
            {n.jenis !== "angka" ? "Hanya untuk butir angka." : rumus.find((r) => r.kode === n.kodeRumus)?.rumus ?? "Penyusun mengisi nilai hitung butir ini di halaman sub-bagian."}
          </FieldDescription>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`bag-${b.id}`}>Bagian anggaran</FieldLabel>
          <Select value={n.bagianKode} onValueChange={(v) => ubah("bagianKode", v)} disabled={terkunci}>
            <SelectTrigger id={`bag-${b.id}`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{bagian.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`tbl-${b.id}`}>Tabel LKPS</FieldLabel>
          <Input id={`tbl-${b.id}`} value={n.tabelLkps} onChange={(e) => ubah("tabelLkps", e.target.value)} placeholder="6.a, 3.a.1" className="font-mono" disabled={terkunci} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`s4-${b.id}`} className="flex items-center gap-2">Deskriptor skor 4 <Usulan aktif={tandai("deskriptor")} /></FieldLabel>
        <Textarea id={`s4-${b.id}`} rows={4} value={n.s4} onChange={(e) => ubah("s4", e.target.value)} className={cn(tandai("deskriptor") && kotakUsulan)} disabled={terkunci} />
        <FieldDescription>Daftar cek skor 4 di halaman penyusun dibuat dari penomoran (1), (2), … di deskriptor ini.</FieldDescription>
      </Field>
      <details>
        <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">Deskriptor skor 3, 2, 1, 0</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(["s3", "s2", "s1", "s0"] as const).map((k) => (
            <Field key={k}>
              <FieldLabel htmlFor={`${k}-${b.id}`}>Skor {k.slice(1)}</FieldLabel>
              <Textarea id={`${k}-${b.id}`} rows={3} value={n[k]} onChange={(e) => ubah(k, e.target.value)} disabled={terkunci} />
            </Field>
          ))}
        </div>
      </details>
      <Field>
        <FieldLabel className="flex items-center gap-2">Sub-bagian template LED <Usulan aktif={tandai("subBagian")} /></FieldLabel>
        <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder={`Cari sub-bagian (tanpa pencarian: sub-bagian ${n.bagianKode})`} className="h-8" aria-label="Cari sub-bagian" />
        <ul className={cn("max-h-48 space-y-1 overflow-y-auto rounded-md border p-2", tandai("subBagian") && kotakUsulan)}>
          {pilihanSub.map((s) => (
            <li key={s.id}>
              <label className="flex items-start gap-2 text-xs">
                <Checkbox
                  checked={n.subBagianIds.includes(s.id)}
                  disabled={terkunci}
                  onCheckedChange={(c) => ubah("subBagianIds", c ? [...n.subBagianIds, s.id] : n.subBagianIds.filter((x) => x !== s.id))}
                />
                <span><span className="font-mono">{s.kode}</span> {s.judul}</span>
              </label>
            </li>
          ))}
          {pilihanSub.length === 0 && <li className="text-xs text-muted-foreground">Tidak ada sub-bagian yang cocok.</li>}
        </ul>
      </Field>
      {!terkunci && (
        <div className="flex flex-wrap justify-end gap-2">
          {!b.dikonfirmasi && (
            <Button
              type="button"
              variant="outline"
              disabled={sibuk}
              onClick={() => jalankan(() => aksiKonfirmasiButir(versiId, b.id), { sukses: `Butir ${b.kode} ditandai sudah dicek.`, lalu: onSelesai })}
            >
              Sudah benar, tandai dicek
            </Button>
          )}
          <Button type="submit" disabled={sibuk}><IkonSibuk sibuk={sibuk} />Simpan dan tandai dicek</Button>
        </div>
      )}
    </form>
  );
}

/** Halaman cek: PDF Matriks Penilaian di kiri, tabel butir yang bisa disunting di kanan. */
export function PanelCek({
  versiId, jenjang, butir, sub, rumus, bagian, halamanButir, adaMatriks, terkunci,
}: {
  versiId: string;
  jenjang: string;
  butir: ButirTampil[];
  sub: SubTampil[];
  rumus: { kode: string; judul: string; rumus: string | null }[];
  bagian: string[];
  halamanButir: Record<string, number[]>;
  adaMatriks: boolean;
  terkunci: boolean;
}) {
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [hanyaBelum, setHanyaBelum] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const kodeSub = useMemo(() => new Map(sub.map((s) => [s.id, s.kode])), [sub]);
  const tampil = butir.filter((b) => !hanyaBelum || !b.dikonfirmasi);

  function pilih(b: ButirTampil) {
    setDipilih((x) => (x === b.id ? null : b.id));
    const h = halamanButir[String(b.no)]?.[0];
    if (h) setHalaman(h);
  }

  function lanjutBerikutnya(id: string) {
    const i = butir.findIndex((b) => b.id === id);
    const berikut = butir.slice(i + 1).find((b) => !b.dikonfirmasi && b.id !== id);
    if (berikut) pilih(berikut);
    else setDipilih(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        {adaMatriks ? (
          <iframe
            key={halaman}
            title="Matriks Penilaian (PDF asli)"
            src={`/api/led/instrumen/${versiId}/berkas/matriks#page=${halaman}&view=FitH`}
            className="h-[70svh] w-full rounded-lg border bg-muted lg:h-[calc(100svh-7rem)]"
          />
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Matriks Penilaian belum diunggah.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">PDF asli, halaman {halaman}. Klik butir di kanan untuk melompat ke halamannya.</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label className="flex items-center gap-2 self-end text-sm">
          <Switch checked={hanyaBelum} onCheckedChange={setHanyaBelum} />
          Hanya yang belum dicek
        </label>
        <ol className="divide-y overflow-hidden rounded-lg border">
          {tampil.map((b) => {
            const buka = dipilih === b.id;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => pilih(b)}
                  aria-expanded={buka}
                  className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60", buka && "bg-muted/60")}
                >
                  {buka ? <ChevronDown className="mt-0.5 size-4 shrink-0" aria-hidden /> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
                  <span className="w-14 shrink-0 font-mono text-xs leading-5">{b.kode}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 font-medium">{b.elemen}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>bobot {b.bobot.toLocaleString("id-ID")}</span>
                      <span>{b.jenis}{b.kodeRumus ? ` · rumus ${b.kodeRumus}` : ""}</span>
                      <span className="font-mono">{b.subBagianIds.map((id) => kodeSub.get(id)).join(", ") || "tanpa sub-bagian"}</span>
                    </span>
                  </span>
                  {b.dikonfirmasi ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" aria-hidden />Dicek</span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><CircleDot className="size-4" aria-hidden />Perlu dicek</span>
                  )}
                </button>
                {buka && (
                  <FormButir
                    key={`${b.id}-${b.dikonfirmasi}`}
                    versiId={versiId}
                    jenjang={jenjang}
                    b={b}
                    sub={sub}
                    rumus={rumus}
                    bagian={bagian}
                    terkunci={terkunci}
                    onSelesai={() => lanjutBerikutnya(b.id)}
                  />
                )}
              </li>
            );
          })}
          {tampil.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Semua butir sudah dicek.</li>}
        </ol>
      </div>
    </div>
  );
}

export function TombolAktifkan({ versiId, bisa, alasan }: { versiId: string; bisa: boolean; alasan: string | null }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={<Button disabled={!bisa || sibuk} title={alasan ?? undefined}><IkonSibuk sibuk={sibuk} /><CheckCircle2 aria-hidden />Sudah dicek, aktifkan</Button>}
      judul="Aktifkan instrumen ini?"
      deskripsi="LED baru jenjang ini akan memakai instrumen ini. Instrumen aktif sebelumnya untuk jenjang yang sama dinonaktifkan tetapi tetap tersimpan, dan LED lama tetap memakai versinya."
      labelAksi="Aktifkan"
      berbahaya={false}
      onKonfirmasi={() => jalankan(() => aksiAktifkanVersiCek(versiId), { sukses: "Instrumen diaktifkan.", lalu: () => router.push(`/led/instrumen/${versiId}`) })}
    />
  );
}
