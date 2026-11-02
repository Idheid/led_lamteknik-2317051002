import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PmNode } from "@tiptap/pm/model";
import { cariJangkar, type Jangkar, type StatusCatatan } from "@/modules/led/domain/review";

/**
 * Sorotan catatan revisi asesor di editor PJ dan pembaca asesor (revisi 22 Okt 2026). Letak dicari ulang dari
 * jangkar (teks persis + konteks) setiap kali dokumen berubah, jadi sorotan tetap menempel saat kalimat lain diubah.
 * Daftar catatan dikirim lewat transaksi dengan meta `kunciCatatan`.
 */

export interface SorotCatatan extends Jangkar {
  id: string;
  status: StatusCatatan;
  aktif?: boolean;
}

interface State {
  catatan: SorotCatatan[];
  dekorasi: DecorationSet;
}

export const kunciCatatan = new PluginKey<State>("sorotan-catatan");

/**
 * Teks polos dokumen editor dan posisi dokumen tiap karakternya (-1 untuk pemisah paragraf "\n"). Urutannya sama
 * dengan teksPolos() di src/modules/led/domain/review.ts (paragraf depth-first, teks anak langsung).
 */
export function petaTeksDokumen(doc: PmNode): { teks: string; pos: number[] } {
  let teks = "";
  const pos: number[] = [];
  let pertama = true;
  doc.descendants((node, posNode) => {
    if (node.type.name !== "paragraph") return true;
    if (!pertama) {
      teks += "\n";
      pos.push(-1);
    }
    pertama = false;
    node.forEach((anak, offset) => {
      if (!anak.isText) return;
      const t = anak.text ?? "";
      for (let i = 0; i < t.length; i++) pos.push(posNode + 1 + offset + i);
      teks += t;
    });
    return false;
  });
  return { teks, pos };
}

/** Rentang posisi dokumen [from, to) → indeks karakter teks polos [mulai, akhir). */
export function indeksDariPosisi(peta: { pos: number[] }, from: number, to: number): { mulai: number; akhir: number } | null {
  let mulai = -1;
  let akhir = -1;
  peta.pos.forEach((p, i) => {
    if (p < 0) return;
    if (p >= from && p < to) {
      if (mulai < 0) mulai = i;
      akhir = i + 1;
    }
  });
  return mulai < 0 ? null : { mulai, akhir };
}

function hitung(doc: PmNode, catatan: SorotCatatan[]): DecorationSet {
  if (!catatan.length) return DecorationSet.empty;
  const peta = petaTeksDokumen(doc);
  const dekorasi: Decoration[] = [];
  for (const c of catatan) {
    const r = cariJangkar(peta.teks, c);
    if (!r) continue;
    // satu dekorasi per potongan dalam satu paragraf (blok bisa melewati batas paragraf)
    let awal = -1;
    for (let i = r.mulai; i <= r.akhir; i++) {
      const p = i < r.akhir ? peta.pos[i] : -1;
      if (p >= 0 && awal < 0) awal = i;
      if ((p < 0 || i === r.akhir) && awal >= 0) {
        dekorasi.push(Decoration.inline(peta.pos[awal], peta.pos[i - 1] + 1, {
          class: `catatan-sorot catatan-${c.status}${c.aktif ? " catatan-aktif" : ""}`,
          "data-catatan-id": c.id,
        }));
        awal = -1;
      }
    }
  }
  return DecorationSet.create(doc, dekorasi);
}

export const SorotanCatatan = Extension.create({
  name: "sorotanCatatan",
  addProseMirrorPlugins() {
    return [
      new Plugin<State>({
        key: kunciCatatan,
        state: {
          init: () => ({ catatan: [], dekorasi: DecorationSet.empty }),
          apply: (tr, lama) => {
            const baru = tr.getMeta(kunciCatatan) as SorotCatatan[] | undefined;
            if (baru) return { catatan: baru, dekorasi: hitung(tr.doc, baru) };
            return tr.docChanged ? { catatan: lama.catatan, dekorasi: hitung(tr.doc, lama.catatan) } : lama;
          },
        },
        props: { decorations: (state) => kunciCatatan.getState(state)?.dekorasi },
      }),
    ];
  },
});
