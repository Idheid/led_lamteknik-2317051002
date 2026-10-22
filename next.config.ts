import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pustaka Node berat (pembaca Excel/PDF/DOCX, antrean) tidak dibundel; dimuat langsung dari node_modules.
  serverExternalPackages: ["exceljs", "unpdf", "mammoth", "pg-boss"],
  // Mode pengembangan yang dibuka dari perangkat lain lewat alamat IP (revisi 22 Okt 2026); produksi tidak memakainya.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
};

export default nextConfig;
