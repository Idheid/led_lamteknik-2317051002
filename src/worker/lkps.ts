import type { PgBoss } from "pg-boss";

/**
 * Pengerja antrean modul LKPS (dikerjakan Ghalib). Masih kosong.
 * Cara menambah: daftarkan nama antrean berawalan "lkps-" di ANTREAN (src/modules/bersama/antrean.ts), lalu
 * `await bos.work(ANTREAN.lkpsImpor, { localConcurrency: 1 }, async ([tugas]) => { ... })` di sini dengan fungsi proses
 * dari src/modules/lkps/proses/.
 */
export async function daftarkanPengerjaLkps(_bos: PgBoss): Promise<void> {}

/** Pekerjaan LKPS yang terputus saat worker mati dikirim ulang (belum ada). */
export async function pulihkanPekerjaanLkps(): Promise<void> {}
