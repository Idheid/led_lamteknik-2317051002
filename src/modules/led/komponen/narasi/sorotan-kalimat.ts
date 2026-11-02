import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PmNode } from "@tiptap/pm/model";
import { kunciKalimat, pecahKalimat, type LabelKalimat } from "@/modules/led/domain/verifikasi";

/**
 * Garis bawah per kalimat di editor (revisi 22 Okt 2026): hijau = sesuai sumber, kuning = sebagian, merah = tidak
 * didukung sumber. Label dicocokkan lewat teks kalimat, jadi kalimat yang disunting kehilangan tandanya sampai
 * pemeriksaan berikutnya. Label baru dikirim lewat transaksi dengan meta `kunciSorotan` (lihat `aturLabelKalimat`)
 * dan disimpan di state plugin.
 */

interface StateSorotan {
  label: Record<string, LabelKalimat>;
  dekorasi: DecorationSet;
}

export const kunciSorotan = new PluginKey<StateSorotan>("sorotan-kalimat");

const KELAS: Record<LabelKalimat, string> = {
  sesuai: "kalimat-sesuai",
  sebagian: "kalimat-sebagian",
  tidak_didukung: "kalimat-tidak",
};

/** Peta indeks karakter teks paragraf → posisi dokumen (anak non-teks menggeser posisi tanpa menambah teks). */
function petaPosisi(node: PmNode, mulai: number): { teks: string; pos: number[] } {
  let teks = "";
  const pos: number[] = [];
  node.forEach((anak, offset) => {
    if (!anak.isText) return;
    const t = anak.text ?? "";
    for (let i = 0; i < t.length; i++) pos.push(mulai + 1 + offset + i);
    teks += t;
  });
  return { teks, pos };
}

function hitung(doc: PmNode, label: Record<string, LabelKalimat>): DecorationSet {
  if (Object.keys(label).length === 0) return DecorationSet.empty;
  const dekorasi: Decoration[] = [];
  doc.descendants((node, posNode) => {
    if (node.type.name !== "paragraph") return true;
    if (node.attrs?.peran === "judul-tabel") return false;
    const { teks, pos } = petaPosisi(node, posNode);
    let cari = 0;
    for (const k of pecahKalimat(teks)) {
      const i = teks.indexOf(k, cari);
      if (i < 0) continue;
      cari = i + k.length;
      const l = label[kunciKalimat(k)];
      if (!l) continue;
      dekorasi.push(Decoration.inline(pos[i], pos[i + k.length - 1] + 1, { class: KELAS[l] }));
    }
    return false;
  });
  return DecorationSet.create(doc, dekorasi);
}

export const SorotanKalimat = Extension.create({
  name: "sorotanKalimat",
  addProseMirrorPlugins() {
    return [
      new Plugin<StateSorotan>({
        key: kunciSorotan,
        state: {
          init: () => ({ label: {}, dekorasi: DecorationSet.empty }),
          apply: (tr, lama) => {
            const baru = tr.getMeta(kunciSorotan) as Record<string, LabelKalimat> | undefined;
            if (baru) return { label: baru, dekorasi: hitung(tr.doc, baru) };
            return tr.docChanged ? { label: lama.label, dekorasi: hitung(tr.doc, lama.label) } : lama;
          },
        },
        props: { decorations: (state) => kunciSorotan.getState(state)?.dekorasi },
      }),
    ];
  },
});
