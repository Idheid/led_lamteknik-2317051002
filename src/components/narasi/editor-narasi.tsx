"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import {
  Bold, Check, CircleAlert, ImagePlus, Italic, List, ListOrdered, Loader2, Redo2, Table2, Trash2, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { daftarkanPenyimpan } from "@/lib/simpan-tertunda";
import type { LabelKalimat } from "@/lib/domain/verifikasi";
import { SorotanKalimat, kunciSorotan } from "./sorotan-kalimat";
import type { DokTiptap, HasilPemeriksaan } from "@/lib/domain/narasi";
import { aksiSimpanSuntingan } from "@/app/proyek/aksi";

/**
 * Editor narasi (F-16): tebal, miring, daftar, tabel, gambar; simpan otomatis. Setiap paragraf menyimpan atribut
 * `sumber` (F-15) yang ditampilkan sebagai penanda kecil di bawah paragraf; penanda tidak ikut diekspor.
 */

const ParagrafBersumber = Paragraph.extend({
  addAttributes() {
    return {
      sumber: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-sumber"),
        renderHTML: (a) => (a.sumber ? { "data-sumber": a.sumber } : {}),
      },
      peran: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-peran"),
        renderHTML: (a) => (a.peran ? { "data-peran": a.peran } : {}),
      },
    };
  },
});

export interface GambarProyek {
  id: string;
  judul: string;
  src: string;
}

type Status = "tersimpan" | "berubah" | "menyimpan" | "gagal";

const JEDA_SIMPAN_MS = 1500;

function TombolAlat({ label, aktif, onClick, children, disabled }: {
  label: string; aktif?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={aktif ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={aktif}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function BilahAlat({ editor, gambar }: { editor: Editor; gambar: GambarProyek[] }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      tebal: e.isActive("bold"),
      miring: e.isActive("italic"),
      butir: e.isActive("bulletList"),
      nomor: e.isActive("orderedList"),
      tabel: e.isActive("table"),
      bisaUndo: e.can().undo(),
      bisaRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1" role="toolbar" aria-label="Format teks">
      <TombolAlat label="Tebal" aktif={s.tebal} onClick={() => c().toggleBold().run()}><Bold /></TombolAlat>
      <TombolAlat label="Miring (istilah asing)" aktif={s.miring} onClick={() => c().toggleItalic().run()}><Italic /></TombolAlat>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <TombolAlat label="Daftar berbutir" aktif={s.butir} onClick={() => c().toggleBulletList().run()}><List /></TombolAlat>
      <TombolAlat label="Daftar bernomor" aktif={s.nomor} onClick={() => c().toggleOrderedList().run()}><ListOrdered /></TombolAlat>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant={s.tabel ? "secondary" : "ghost"} size="sm" onMouseDown={(e) => e.preventDefault()}>
            <Table2 aria-hidden />
            Tabel
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Sisipkan tabel 3 × 3</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!s.tabel} onSelect={() => c().addRowAfter().run()}>Tambah baris</DropdownMenuItem>
          <DropdownMenuItem disabled={!s.tabel} onSelect={() => c().addColumnAfter().run()}>Tambah kolom</DropdownMenuItem>
          <DropdownMenuItem disabled={!s.tabel} onSelect={() => c().deleteRow().run()}>Hapus baris</DropdownMenuItem>
          <DropdownMenuItem disabled={!s.tabel} onSelect={() => c().deleteColumn().run()}>Hapus kolom</DropdownMenuItem>
          <DropdownMenuItem disabled={!s.tabel} variant="destructive" onSelect={() => c().deleteTable().run()}>
            <Trash2 aria-hidden />Hapus tabel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()}>
            <ImagePlus aria-hidden />
            Gambar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-xs">
          <DropdownMenuLabel>Gambar yang sudah diunggah</DropdownMenuLabel>
          {gambar.length === 0 ? (
            <DropdownMenuItem disabled>Belum ada gambar. Unggah gambar di bagian Dokumen pendukung.</DropdownMenuItem>
          ) : gambar.map((g) => (
            <DropdownMenuItem key={g.id} onSelect={() => c().setImage({ src: g.src, alt: g.judul, title: g.judul }).run()}>
              <span className="truncate">{g.judul}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="ml-auto flex items-center">
        <TombolAlat label="Urungkan" disabled={!s.bisaUndo} onClick={() => c().undo().run()}><Undo2 /></TombolAlat>
        <TombolAlat label="Ulangi" disabled={!s.bisaRedo} onClick={() => c().redo().run()}><Redo2 /></TombolAlat>
      </span>
    </div>
  );
}

export function EditorNarasi({
  proyekId, subBagianKode, isi, gambar, onTersimpan, labelKalimat,
}: {
  proyekId: string;
  subBagianKode: string;
  isi: DokTiptap | null;
  gambar: GambarProyek[];
  onTersimpan?: (h: { nomor: number; pemeriksaan: HasilPemeriksaan; disimpan: string }) => void;
  /** revisi 22 Okt 2026: label verifikasi per kalimat (kunci = kunciKalimat) untuk garis bawah berwarna */
  labelKalimat?: Record<string, LabelKalimat>;
}) {
  const [status, setStatus] = useState<Status>("tersimpan");
  const [pesan, setPesan] = useState<string | null>(null);
  const [waktu, setWaktu] = useState<string | null>(null);
  const pewaktu = useRef<ReturnType<typeof setTimeout> | null>(null);
  const antre = useRef<Promise<void>>(Promise.resolve());
  const terakhirBerhasil = useRef(true);
  const callback = useRef(onTersimpan);
  useEffect(() => {
    callback.current = onTersimpan;
  }, [onTersimpan]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false, heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false,
        strike: false, link: false, underline: false,
      }),
      ParagrafBersumber,
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      SorotanKalimat,
    ],
    content: isi ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: { attributes: { class: "editor-narasi min-h-40 px-4 py-3 focus:outline-none", "aria-label": "Narasi" } },
    onUpdate: ({ editor: e }) => {
      setStatus("berubah");
      if (pewaktu.current) clearTimeout(pewaktu.current);
      pewaktu.current = setTimeout(() => {
        pewaktu.current = null;
        simpan(e);
      }, JEDA_SIMPAN_MS);
    },
  });

  function simpan(e: Editor) {
    // simpan berurutan supaya versi tidak tertukar
    antre.current = antre.current.then(async () => {
      setStatus("menyimpan");
      // salinan JSON murni: atribut Tiptap bukan objek biasa sehingga tidak bisa dikirim apa adanya ke aksi server
      const r = await aksiSimpanSuntingan(proyekId, subBagianKode, JSON.parse(JSON.stringify(e.getJSON())));
      terakhirBerhasil.current = r.ok;
      if (r.ok) {
        setPesan(null);
        setWaktu(r.data.disimpan);
        setStatus((s) => (s === "menyimpan" ? "tersimpan" : s));
        callback.current?.(r.data);
      } else {
        setPesan(r.pesan);
        setStatus("gagal");
      }
    });
  }

  useEffect(() => {
    if (status !== "berubah" && status !== "menyimpan") return;
    const cegah = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [status]);

  // label verifikasi berubah (hasil cek otomatis setelah simpan, atau Periksa dengan AI): gambar ulang garis bawah
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(kunciSorotan, labelKalimat ?? {}));
  }, [labelKalimat, editor]);

  // simpan segera sebelum pindah halaman (Sebelumnya/Berikutnya) atau saat editor dilepas
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  useEffect(() => {
    const simpanSegera = async () => {
      if (pewaktu.current && editorRef.current) {
        clearTimeout(pewaktu.current);
        pewaktu.current = null;
        simpan(editorRef.current);
      }
      await antre.current;
      return terakhirBerhasil.current;
    };
    const lepas = daftarkanPenyimpan(simpanSegera);
    return () => {
      lepas();
      if (pewaktu.current) void simpanSegera();
    };
    // simpan() hanya memakai ref dan prop yang tetap selama editor ini hidup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {editor ? <BilahAlat editor={editor} gambar={gambar} /> : <div className="h-10 border-b bg-muted/40" />}
      <EditorContent editor={editor} />
      <div className={cn("flex items-center justify-end gap-1 border-t px-3 py-1.5 text-xs text-muted-foreground", status === "gagal" && "text-destructive")} aria-live="polite">
        {status === "menyimpan" && <><Loader2 className="size-3 animate-spin" aria-hidden />Menyimpan…</>}
        {status === "berubah" && "Belum tersimpan"}
        {status === "tersimpan" && (waktu
          ? <><Check className="size-3" aria-hidden />Tersimpan {new Date(waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>
          : "Perubahan disimpan otomatis sebagai versi suntingan")}
        {status === "gagal" && <><CircleAlert className="size-3" aria-hidden />{pesan ?? "Gagal menyimpan"}</>}
      </div>
    </div>
  );
}
