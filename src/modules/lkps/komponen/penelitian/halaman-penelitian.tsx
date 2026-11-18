"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/penelitian/page.tsx.
// Gabung LKPS G7: isi dipindah ke komponen bersama penelitian/penelitian-dosen.tsx (Penelitian dan PkM sama).

import { HalamanPenelitianDosen } from "@/modules/lkps/komponen/penelitian/penelitian-dosen";

export default function HalamanPenelitian() {
  return <HalamanPenelitianDosen jenis="Penelitian" />;
}
