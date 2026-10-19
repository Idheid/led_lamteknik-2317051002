export { muatKriteria, type DataKriteria } from "@/lib/data/kriteria";

export function hrefSub(proyekId: string, bagianKode: string, subKode: string) {
  return `/proyek/${proyekId}/bagian/${encodeURIComponent(bagianKode)}/${encodeURIComponent(subKode)}`;
}

export function hrefKriteria(proyekId: string, bagianKode: string) {
  return `/proyek/${proyekId}/bagian/${encodeURIComponent(bagianKode)}`;
}
