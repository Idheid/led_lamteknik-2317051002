import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pustaka Node berat (pembaca Excel/PDF/DOCX, antrean) tidak dibundel; dimuat langsung dari node_modules.
  serverExternalPackages: ["exceljs", "unpdf", "mammoth", "pg-boss"],
};

export default nextConfig;
