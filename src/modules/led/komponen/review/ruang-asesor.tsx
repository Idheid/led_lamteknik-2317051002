"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { MessageSquarePlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { catatanDariKlik, ekstensiNarasi } from "@/modules/led/komponen/narasi/editor-narasi";
import { buatJangkar, type Jangkar } from "@/modules/led/domain/review";
import type { DokTiptap } from "@/modules/led/domain/narasi";
import type { CatatanTampil } from "@/modules/led/data/review";
import { indeksDariPosisi, kunciCatatan, petaTeksDokumen } from "./sorotan-catatan";
import { PanelCatatan, keSorotan, useCatatanLangsung } from "./panel-catatan";
import { aksiBuatCatatan } from "@/app/led/aksi-review";

/**
 * Layar asesor untuk satu sub-bagian (revisi 22 Okt 2026): narasi versi aktif hanya baca, blok teks untuk menulis
 * catatan revisi, dan daftar catatan yang diperbarui otomatis.
 */
export function RuangAsesor({ proyekId, subBagianKode, versiId, isi, catatanAwal, bolehCatat }: {
  proyekId: string;
  subBagianKode: string;
  /** versi aktif yang ditampilkan */
  versiId: string;
  isi: DokTiptap;
  catatanAwal: CatatanTampil[];
  /** LED berstatus Direview */
  bolehCatat: boolean;
}) {
  const router = useRouter();
  const { catatan, muat, versiAktifId } = useCatatanLangsung(proyekId, subBagianKode, catatanAwal, versiId);
  const [aktif, setAktif] = useState<string | null>(null);
  const [blok, setBlok] = useState<Jangkar | null>(null);
  const [isiCatatan, setIsiCatatan] = useState("");
  const { sibuk, jalankan } = useAksi();
  const pilihCatatan = useRef<(id: string) => void>(() => undefined);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: ekstensiNarasi(),
    content: isi,
    editorProps: {
      attributes: { class: "editor-narasi min-h-40 px-4 py-3", "aria-label": "Narasi (hanya baca)" },
      handleDOMEvents: {
        click: (_v, ev) => {
          const id = catatanDariKlik(ev);
          if (id) pilihCatatan.current(id);
          return false;
        },
      },
    },
  });

  useEffect(() => {
    pilihCatatan.current = (id: string) => {
      setAktif(id);
      document.getElementById(`catatan-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
  });

  // revisi 26 Okt 2026: dibuka dari Ringkasan review (…#catatan-<id>): catatan itu disorot dan digulir ke tengah
  useEffect(() => {
    const m = /^#catatan-(.+)$/.exec(window.location.hash);
    if (!m) return;
    const t = setTimeout(() => {
      setAktif(m[1]);
      document.getElementById(`catatan-${m[1]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const sorotan = useMemo(() => keSorotan(catatan, aktif), [catatan, aktif]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(kunciCatatan, sorotan));
  }, [sorotan, editor]);

  /** Blok teks di pembaca: posisi DOM → posisi dokumen → indeks teks polos → jangkar. */
  function bacaBlok() {
    if (!editor || !bolehCatat) return;
    const sel = window.getSelection();
    const dom = editor.view.dom;
    if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode || !dom.contains(sel.anchorNode) || !dom.contains(sel.focusNode)) return;
    try {
      const a = editor.view.posAtDOM(sel.anchorNode, sel.anchorOffset);
      const b = editor.view.posAtDOM(sel.focusNode, sel.focusOffset);
      const peta = petaTeksDokumen(editor.state.doc);
      const r = indeksDariPosisi(peta, Math.min(a, b), Math.max(a, b));
      const j = r && buatJangkar(peta.teks, r.mulai, r.akhir);
      if (j) setBlok(j);
    } catch {
      // blok di luar teks narasi (mis. gambar): abaikan
    }
  }

  const simpan = () => blok && jalankan(
    () => aksiBuatCatatan(proyekId, { subBagianKode, ...blok, isi: isiCatatan }),
    {
      sukses: "Catatan dikirim; Tim Prodi langsung melihatnya.",
      lalu: (id) => {
        setBlok(null);
        setIsiCatatan("");
        setAktif(id);
        window.getSelection()?.removeAllRanges();
        void muat();
      },
    },
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-2">
        {versiAktifId && versiAktifId !== versiId && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm" role="status">
            Tim Prodi menyimpan versi baru narasi ini.
            <Button size="sm" variant="outline" onClick={() => router.refresh()}><RefreshCw aria-hidden />Tampilkan versi terbaru</Button>
          </div>
        )}
        <div className="overflow-hidden rounded-lg border bg-background" onMouseUp={bacaBlok} onKeyUp={bacaBlok}>
          <EditorContent editor={editor} />
        </div>
        {bolehCatat ? (
          blok ? (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Teks yang diblok:</p>
              <blockquote className="line-clamp-4 border-l-2 border-primary/50 pl-2 text-sm">{blok.teks}</blockquote>
              <Textarea value={isiCatatan} onChange={(e) => setIsiCatatan(e.target.value)} rows={3} placeholder="Catatan revisi: apa yang perlu diperbaiki atau ditambahkan" aria-label="Catatan revisi" autoFocus />
              <div className="flex gap-2">
                <Button size="sm" onClick={simpan} disabled={sibuk || !isiCatatan.trim()}><IkonSibuk sibuk={sibuk} /><MessageSquarePlus aria-hidden />Kirim catatan</Button>
                <Button size="sm" variant="ghost" onClick={() => setBlok(null)}>Batal</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Blok (sorot) kalimat di narasi untuk menulis catatan revisi.</p>
          )
        ) : (
          <p className="text-xs text-muted-foreground">Catatan baru bisa ditulis setelah Tim Prodi mengajukan review (status Direview).</p>
        )}
      </div>
      <PanelCatatan catatan={catatan} peran="ASESOR" bolehUbah aktif={aktif} onPilih={(id) => setAktif(id)} muat={muat} />
    </div>
  );
}
