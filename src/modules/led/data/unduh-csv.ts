/** Respons unduhan CSV (data uji pencarian, Rencana 10 Nov T2). */
export function responsCsv(csv: string, nama: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nama.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(nama)}`,
      "Cache-Control": "no-store",
    },
  });
}
