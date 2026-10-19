"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FlaskConical, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { penjelasanModel, type ModelGoogle } from "@/lib/domain/model-llm";
import { aksiMuatDaftarModel, aksiSimpanPengaturan, aksiUjiModel } from "../aksi";

interface Awal {
  modelNarasi: string;
  modelCadangan: string[];
  modelEmbedding: string;
  pakaiCadanganAdmin: boolean;
}

/** Tombol muat ulang daftar model dari Google (models.list). */
export function TombolMuatDaftar() {
  const { sibuk, jalankan } = useAksi();
  return (
    <Button
      variant="outline"
      disabled={sibuk}
      onClick={() =>
        jalankan(() => aksiMuatDaftarModel(), {
          lalu: (r) =>
            toast.success(`${r.jumlah} model dimuat dari Google.${r.diganti ? ` Model narasi diganti ke ${r.diganti}.` : ""}`),
        })
      }
    >
      {sibuk ? <IkonSibuk sibuk /> : <RefreshCw aria-hidden />}
      Muat ulang daftar
    </Button>
  );
}

function TombolUji({ jenis, kode }: { jenis: "narasi" | "embedding"; kode: string }) {
  const [sibuk, mulai] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={sibuk || !kode}
      onClick={() =>
        mulai(async () => {
          const r = await aksiUjiModel(jenis, kode);
          if (!r.ok) toast.error(r.pesan);
          else if (r.data.ok) toast.success(r.data.pesan);
          else toast.error(r.data.pesan);
        })
      }
    >
      {sibuk ? <IkonSibuk sibuk /> : <FlaskConical aria-hidden />}
      Uji model
    </Button>
  );
}

/** Daftar pilihan; model yang tersimpan tetapi tidak ada di daftar tetap ditampilkan agar tidak hilang diam-diam. */
function pilihan(daftar: ModelGoogle[], ...tambahan: string[]): ModelGoogle[] {
  const ada = new Set(daftar.map((m) => m.kode));
  const lain = tambahan.filter((k) => k && !ada.has(k)).map((k) => ({ kode: k, nama: `${k} (tidak ada di daftar)`, deskripsi: "", metode: [], batasMasuk: null, batasKeluar: null }));
  return [...lain, ...daftar];
}

function PilihModel({
  id, nilai, daftar, onUbah, placeholder,
}: { id: string; nilai: string; daftar: ModelGoogle[]; onUbah: (v: string) => void; placeholder?: string }) {
  return (
    <Select value={nilai || undefined} onValueChange={onUbah}>
      <SelectTrigger id={id} className="w-full max-w-md">
        <SelectValue placeholder={placeholder ?? "Pilih model"} />
      </SelectTrigger>
      <SelectContent>
        {daftar.map((m) => (
          <SelectItem key={m.kode} value={m.kode}>
            {m.nama} <span className="font-mono text-xs text-muted-foreground">{m.kode}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Penjelasan({ kode, daftar }: { kode: string; daftar: ModelGoogle[] }) {
  if (!kode) return null;
  const m = daftar.find((x) => x.kode === kode);
  return (
    <FieldDescription>
      <span className="font-mono">{kode}</span> · {penjelasanModel(kode)}
      {m?.batasMasuk ? ` Batas masukan ${m.batasMasuk.toLocaleString("id-ID")} token.` : ""}
    </FieldDescription>
  );
}

export function FormModel({ awal, narasi, embedding }: { awal: Awal; narasi: ModelGoogle[]; embedding: ModelGoogle[] }) {
  const { sibuk, jalankan } = useAksi();
  const [n, setN] = useState<Awal>(awal);
  const [tambah, setTambah] = useState("");
  const opsiNarasi = pilihan(narasi, n.modelNarasi, ...n.modelCadangan);
  const opsiEmbedding = pilihan(embedding, n.modelEmbedding);
  const opsiCadangan = opsiNarasi.filter((m) => m.kode !== n.modelNarasi && !n.modelCadangan.includes(m.kode));
  const gantiEmbedding = n.modelEmbedding !== awal.modelEmbedding;

  const geser = (i: number, arah: -1 | 1) => {
    const c = [...n.modelCadangan];
    [c[i], c[i + arah]] = [c[i + arah], c[i]];
    setN({ ...n, modelCadangan: c });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aksiSimpanPengaturan(n), {
          lalu: (diantre) => toast.success(diantre ? `Pengaturan disimpan. ${diantre} dokumen diantre untuk diproses ulang.` : "Pengaturan disimpan."),
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="model-narasi">Model narasi (generateContent)</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <PilihModel
              id="model-narasi"
              nilai={n.modelNarasi}
              daftar={opsiNarasi}
              onUbah={(v) => setN({ ...n, modelNarasi: v, modelCadangan: n.modelCadangan.filter((k) => k !== v) })}
            />
            <TombolUji jenis="narasi" kode={n.modelNarasi} />
          </div>
          <Penjelasan kode={n.modelNarasi} daftar={narasi} />
        </Field>

        <Field>
          <FieldLabel>Model cadangan (dicoba berurutan bila model narasi kena batas kuota)</FieldLabel>
          {n.modelCadangan.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada model cadangan.</p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {n.modelCadangan.map((k, i) => (
                <li key={k} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{opsiNarasi.find((m) => m.kode === k)?.nama ?? k}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-mono">{k}</span> · {penjelasanModel(k)}</p>
                  </div>
                  <TombolUji jenis="narasi" kode={k} />
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => geser(i, -1)} aria-label="Naikkan">
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === n.modelCadangan.length - 1} onClick={() => geser(i, 1)} aria-label="Turunkan">
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon-sm" aria-label="Hapus dari cadangan"
                    onClick={() => setN({ ...n, modelCadangan: n.modelCadangan.filter((x) => x !== k) })}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ol>
          )}
          {n.modelCadangan.length < 5 && opsiCadangan.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <PilihModel id="tambah-cadangan" nilai={tambah} daftar={opsiCadangan} onUbah={setTambah} placeholder="Pilih model cadangan" />
              <Button
                type="button" variant="outline" size="sm" disabled={!tambah}
                onClick={() => {
                  setN({ ...n, modelCadangan: [...n.modelCadangan, tambah] });
                  setTambah("");
                }}
              >
                <Plus aria-hidden />
                Tambah
              </Button>
            </div>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="model-embedding">Model embedding (embedContent)</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <PilihModel id="model-embedding" nilai={n.modelEmbedding} daftar={opsiEmbedding} onUbah={(v) => setN({ ...n, modelEmbedding: v })} />
            <TombolUji jenis="embedding" kode={n.modelEmbedding} />
          </div>
          <Penjelasan kode={n.modelEmbedding} daftar={embedding} />
          {gantiEmbedding && (
            <FieldDescription className="text-amber-700 dark:text-amber-400">
              Menyimpan akan memproses ulang semua dokumen teks di semua proyek.
            </FieldDescription>
          )}
        </Field>

        <Field orientation="horizontal">
          <Switch
            id="pakai-cadangan-admin"
            checked={n.pakaiCadanganAdmin}
            onCheckedChange={(v) => setN({ ...n, pakaiCadanganAdmin: v })}
          />
          <div>
            <FieldLabel htmlFor="pakai-cadangan-admin">Izinkan LED memakai kunci cadangan admin</FieldLabel>
            <FieldDescription>Dipakai setelah semua kunci fakultas habis kuotanya.</FieldDescription>
          </div>
        </Field>

        <Button type="submit" disabled={sibuk} className="w-fit">
          <IkonSibuk sibuk={sibuk} />
          Simpan
        </Button>
      </FieldGroup>
    </form>
  );
}
