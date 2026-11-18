// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/templates/index.ts. Dipindah tanpa perubahan isi (Gabung LKPS G3).
// Template Baku Regulasi, Kriteria & Tabel LKPS LAM Teknik

export * from "./types.ts";
export { kriteria1TataPamong } from "./kriteria-1-tata-pamong.ts";
export { kriteria2Mahasiswa } from "./kriteria-2-mahasiswa.ts";
export { kriteria3SDM } from "./kriteria-3-sdm.ts";
export { kriteria4Keuangan } from "./kriteria-4-keuangan.ts";
export { kriteria5Pendidikan } from "./kriteria-5-pendidikan.ts";
export { kriteria6Penelitian } from "./kriteria-6-penelitian.ts";
export { kriteria7PkM } from "./kriteria-7-pkm.ts";
export { kriteria8Luaran } from "./kriteria-8-luaran.ts";
export { kriteria9SPMI } from "./kriteria-9-penjaminan.ts";

import { kriteria1TataPamong } from "./kriteria-1-tata-pamong.ts";
import { kriteria2Mahasiswa } from "./kriteria-2-mahasiswa.ts";
import { kriteria3SDM } from "./kriteria-3-sdm.ts";
import { kriteria4Keuangan } from "./kriteria-4-keuangan.ts";
import { kriteria5Pendidikan } from "./kriteria-5-pendidikan.ts";
import { kriteria6Penelitian } from "./kriteria-6-penelitian.ts";
import { kriteria7PkM } from "./kriteria-7-pkm.ts";
import { kriteria8Luaran } from "./kriteria-8-luaran.ts";
import { kriteria9SPMI } from "./kriteria-9-penjaminan.ts";
import type { KriteriaTemplateDef } from "./types.ts";

export const LAM_TEKNIK_2024_TEMPLATE: KriteriaTemplateDef[] = [
  kriteria1TataPamong,
  kriteria2Mahasiswa,
  kriteria3SDM,
  kriteria4Keuangan,
  kriteria5Pendidikan,
  kriteria6Penelitian,
  kriteria7PkM,
  kriteria8Luaran,
  kriteria9SPMI,
];
