import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pustaka Node berat (pembaca Excel/PDF/DOCX, antrean) tidak dibundel; dimuat langsung dari node_modules.
  serverExternalPackages: ["exceljs", "unpdf", "mammoth", "pg-boss"],
  // Mode pengembangan yang dibuka dari perangkat lain lewat alamat IP (revisi 22 Okt 2026); produksi tidak memakainya.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
  // 31 Okt 2026: satu website untuk modul LKPS dan LED. Alamat lama (penanda buku, tautan di pemberitahuan lama)
  // diarahkan ke alamat baru. Urutan penting: aturan yang lebih khusus di atas.
  async redirects() {
    return [
      { source: "/proyek/prodi/:jalur*", destination: "/pengaturan/prodi/:jalur*", permanent: false },
      // revisi 31 Okt 2026 (B3): kunci API hanya di halaman Admin UPPS
      { source: "/proyek/kunci-api/:jalur*", destination: "/admin/kunci-api/:jalur*", permanent: false },
      { source: "/pengaturan/kunci-api/:jalur*", destination: "/admin/kunci-api/:jalur*", permanent: false },
      { source: "/proyek/:jalur*", destination: "/led/:jalur*", permanent: false },
      { source: "/proyek", destination: "/led", permanent: false },
      { source: "/asesor/:jalur*", destination: "/led/asesor/:jalur*", permanent: false },
      { source: "/asesor", destination: "/led/asesor", permanent: false },
    ];
  },
};

export default nextConfig;
