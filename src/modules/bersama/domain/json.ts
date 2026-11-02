/**
 * Perbaikan ringan keluaran JSON model (revisi 23 Okt 2026). Gemini sesekali membungkus JSON dengan pagar kode
 * ```json, menambah teks sebelum/sesudahnya, atau koma berlebih sebelum } / ]. Mengembalikan objek hasil parse, atau
 * null bila tetap tidak terbaca (mis. jawaban kosong atau terpotong).
 */
export function perbaikiJson(teks: string | null | undefined): unknown {
  if (!teks) return null;
  let t = teks.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const awal = t.indexOf('{');
  const akhir = t.lastIndexOf('}');
  if (awal < 0 || akhir <= awal) return null;
  t = t.slice(awal, akhir + 1);
  for (const calon of [t, t.replace(/,\s*([}\]])/g, '$1')]) {
    try {
      return JSON.parse(calon);
    } catch {
      // coba bentuk berikutnya
    }
  }
  return null;
}
