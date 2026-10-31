export { muatKriteria, type DataKriteria } from "@/modules/led/data/kriteria";

export function hrefSub(proyekId: string, bagianKode: string, subKode: string) {
  return `/led/${proyekId}/bagian/${encodeURIComponent(bagianKode)}/${encodeURIComponent(subKode)}`;
}

export function hrefKriteria(proyekId: string, bagianKode: string) {
  return `/led/${proyekId}/bagian/${encodeURIComponent(bagianKode)}`;
}
