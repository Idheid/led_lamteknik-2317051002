"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSearch, Loader2, Save, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PILIHAN_PERINGKAT, type UsulanSk } from "@/modules/bersama/domain/akreditasi";
import { formatAngka } from "@/modules/bersama/domain/teks";

const LAINNYA = "__lainnya";

type Isian = { lembaga: string; peringkat: string; nomorSk: string; tanggalSk: string; berlakuMulai: string; berlakuSampai: string };
const KUNCI: (keyof UsulanSk)[] = ["peringkat", "nomorSk", "tanggalSk", "berlakuMulai", "berlakuSampai"];

/**
 * Catat hasil akreditasi (L1, 2 Nov 2026). Bantuan isi dari PDF SK tanpa AI; "Baca dengan AI" hanya atas klik setelah
 * perkiraan token tampil. Isian yang terisi dari SK ditandai "dari SK" dan tetap diperiksa pengguna.
 */
export function FormHasilAkreditasi({ prodiId, proyekId, pilihanLed, admin, kembaliKe }: {
  prodiId: string;
  proyekId?: string | null;
  /** Admin dari halaman Program studi: LED yang bisa dikaitkan (opsional) */
  pilihanLed?: { id: string; label: string }[];
  admin: boolean;
  kembaliKe: string;
}) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [isi, setIsi] = useState<Isian>({ lembaga: "LAM Teknik", peringkat: "", nomorSk: "", tanggalSk: "", berlakuMulai: "", berlakuSampai: "" });
  const [pilihPeringkat, setPilihPeringkat] = useState("");
  const [led, setLed] = useState(proyekId ?? pilihanLed?.[0]?.id ?? "");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [dariSk, setDariSk] = useState<Set<string>>(new Set());
  const [sibuk, setSibuk] = useState<"pola" | "perkiraan" | "ai" | "simpan" | null>(null);
  const [perkiraan, setPerkiraan] = useState<{ perkiraanToken: number; model: string } | null>(null);

  const ubah = (k: keyof Isian, v: string) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setDariSk((d) => { const n = new Set(d); n.delete(k); return n; });
  };

  function terapkan(u: UsulanSk) {
    const ada = KUNCI.filter((k) => u[k]);
    if (!ada.length) {
      toast.warning("Pola SK tidak dikenali. Isi manual, atau coba Baca dengan AI.");
      return;
    }
    setIsi((x) => ({ ...x, ...Object.fromEntries(ada.map((k) => [k, u[k]!])) }));
    if (u.peringkat) setPilihPeringkat((PILIHAN_PERINGKAT as readonly string[]).includes(u.peringkat) ? u.peringkat : LAINNYA);
    setDariSk(new Set(ada));
    toast.success(`${ada.length} isian diisi dari SK. Periksa sebelum menyimpan.`);
  }

  async function kirimSk(mode: "pola" | "perkiraan" | "ai") {
    if (!berkas) return toast.error("Pilih PDF SK lebih dulu.");
    const f = new FormData();
    f.append("berkas", berkas);
    f.append("mode", mode);
    setSibuk(mode);
    try {
      const r = await fetch("/api/akreditasi/sk", { method: "POST", body: f });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data.pesan ?? `Gagal membaca SK (${r.status}).`);
      if (mode === "perkiraan") setPerkiraan(data);
      else terapkan(data.usulan ?? {});
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setSibuk(null);
    }
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    const f = new FormData();
    f.append("data", JSON.stringify({ prodiId, proyekId: led || null, ...isi }));
    if (berkas) f.append("berkas", berkas);
    setSibuk("simpan");
    try {
      const r = await fetch("/api/akreditasi", { method: "POST", body: f });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data.pesan ?? `Gagal menyimpan (${r.status}).`);
      toast.success(data.status === "menunggu" ? "Hasil akreditasi dicatat dan menunggu konfirmasi Admin UPPS." : "Hasil akreditasi dicatat. Data prodi diperbarui.");
      router.push(kembaliKe);
      router.refresh();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setSibuk(null);
    }
  }

  const tanda = (k: string) => dariSk.has(k) && <Badge variant="outline" className="ml-2">dari SK</Badge>;

  return (
    <form onSubmit={simpan} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hasil akreditasi</CardTitle>
          <CardDescription>
            {admin ? "Dicatat Admin UPPS: langsung berlaku." : "Dicatat Tim Prodi: berlaku setelah dikonfirmasi Admin UPPS."} Tanggal berakhir prodi diambil dari catatan ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {pilihanLed && (
              <Field>
                <FieldLabel htmlFor="hasil-led">LED yang diajukan</FieldLabel>
                <Select value={led || "tanpa"} onValueChange={(v) => setLed(v === "tanpa" ? "" : v)}>
                  <SelectTrigger id="hasil-led" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pilihanLed.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                    <SelectItem value="tanpa">Tanpa LED (SK dari luar sistem)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>LED yang dipilih diarsipkan setelah hasilnya berlaku.</FieldDescription>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="hasil-peringkat">Peringkat{tanda("peringkat")}</FieldLabel>
                <Select value={pilihPeringkat} onValueChange={(v) => { setPilihPeringkat(v); ubah("peringkat", v === LAINNYA ? "" : v); }}>
                  <SelectTrigger id="hasil-peringkat" className="w-full"><SelectValue placeholder="Pilih peringkat" /></SelectTrigger>
                  <SelectContent>
                    {PILIHAN_PERINGKAT.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                    <SelectItem value={LAINNYA}>Lainnya…</SelectItem>
                  </SelectContent>
                </Select>
                {pilihPeringkat === LAINNYA && (
                  <Input aria-label="Peringkat lainnya" className="mt-2" value={isi.peringkat} onChange={(e) => ubah("peringkat", e.target.value)} placeholder="contoh: Baik Sekali" />
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="hasil-lembaga">Lembaga</FieldLabel>
                <Input id="hasil-lembaga" value={isi.lembaga} onChange={(e) => ubah("lembaga", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="hasil-nomor">Nomor SK{tanda("nomorSk")}</FieldLabel>
                <Input id="hasil-nomor" value={isi.nomorSk} onChange={(e) => ubah("nomorSk", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="hasil-tanggal">Tanggal SK{tanda("tanggalSk")}</FieldLabel>
                <Input id="hasil-tanggal" type="date" className="w-fit" value={isi.tanggalSk} onChange={(e) => ubah("tanggalSk", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="hasil-mulai">Berlaku mulai{tanda("berlakuMulai")}</FieldLabel>
                <Input id="hasil-mulai" type="date" className="w-fit" value={isi.berlakuMulai} onChange={(e) => ubah("berlakuMulai", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="hasil-sampai">Berlaku sampai{tanda("berlakuSampai")}</FieldLabel>
                <Input id="hasil-sampai" type="date" className="w-fit" value={isi.berlakuSampai} onChange={(e) => ubah("berlakuSampai", e.target.value)} />
                <FieldDescription>Dipakai untuk pengingat LED periode berikutnya (18, 12, dan 6 bulan sebelumnya).</FieldDescription>
              </Field>
            </div>
            <Button type="submit" className="w-fit" disabled={sibuk !== null}>
              {sibuk === "simpan" ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}Simpan hasil akreditasi
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="xl:self-start">
        <CardHeader>
          <CardTitle className="text-base">PDF SK (opsional)</CardTitle>
          <CardDescription>Disimpan bersama riwayat. Bisa dipakai untuk mengisi formulir.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <input ref={masukan} type="file" accept=".pdf,application/pdf" className="sr-only" aria-label="Pilih PDF SK"
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" className="w-fit" onClick={() => masukan.current?.click()}>
            <Upload aria-hidden />{berkas ? "Ganti PDF" : "Pilih PDF SK"}
          </Button>
          {berkas && <p className="break-words text-xs text-muted-foreground">{berkas.name}</p>}
          <Button type="button" variant="outline" className="w-fit" disabled={!berkas || sibuk !== null} onClick={() => kirimSk("pola")}>
            {sibuk === "pola" ? <Loader2 className="animate-spin" aria-hidden /> : <FileSearch aria-hidden />}Isi dari PDF SK
          </Button>
          <p className="text-xs text-muted-foreground">Tanpa AI: mencari tanggal berlaku, nomor SK, dan peringkat di teks SK.</p>
          <Button type="button" variant="outline" className="w-fit" disabled={!berkas || sibuk !== null} onClick={() => kirimSk("perkiraan")}>
            {sibuk === "perkiraan" || sibuk === "ai" ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}Baca dengan AI
          </Button>
          <p className="text-xs text-muted-foreground">Untuk SK yang polanya tidak dikenali. Memakai token; perkiraannya tampil dulu.</p>
        </CardContent>
      </Card>
      <AlertDialog open={perkiraan !== null} onOpenChange={(b) => !b && setPerkiraan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Baca SK dengan AI?</AlertDialogTitle>
            <AlertDialogDescription>
              Perkiraan {formatAngka(perkiraan?.perkiraanToken ?? 0, 0)} token. Model: {perkiraan?.model}. Yang dikirim hanya teks SK; angka panjang
              seperti NIP disamarkan. Hasilnya hanya mengisi formulir dan tetap Anda periksa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPerkiraan(null); void kirimSk("ai"); }}>Kirim ke AI</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
