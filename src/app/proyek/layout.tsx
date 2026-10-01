import { wajibPenanggungJawab } from "@/lib/sesi";

/** Semua halaman /proyek hanya untuk penanggung jawab prodi. Tata letak sidebar dipasang per halaman. */
export default async function LayoutProyek({ children }: LayoutProps<"/proyek">) {
  await wajibPenanggungJawab();
  return children;
}
