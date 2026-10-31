/** Jalur kembali dari parameter URL: hanya jalur di dalam aplikasi ("/…", bukan "//host"); selain itu `bawaan`. */
export function jalurAman(nilai: string | string[] | undefined, bawaan: string): string {
  return typeof nilai === "string" && nilai.startsWith("/") && !nilai.startsWith("//") && !nilai.includes("\\") ? nilai : bawaan;
}
