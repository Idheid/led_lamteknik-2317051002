import { wajibPeran } from "@/modules/bersama/sesi";
import { ShellLkps } from "@/modules/lkps/komponen/shell-lkps";
import { PenyediaLkps } from "@/modules/lkps/komponen/bersama/konteks";
import { PemilihProdi } from "@/modules/lkps/komponen/pemilih-prodi";
import { prodiAktifHalaman } from "@/modules/lkps/komponen/prodi-halaman";
import { pilihanProdiLkps } from "@/modules/lkps/data/prodi-aktif";
import "@/modules/lkps/komponen/gaya-lkps.css";

/**
 * Modul LKPS: terbuka untuk Admin UPPS, Tim Prodi, dan reviewer LPMPP (Tamu tidak). Gabung LKPS G5: pemilih prodi untuk
 * Admin UPPS dan reviewer (cookie lkps_prodi), konteks peran/prodi untuk halaman klien, dan gaya kode asal Ghalib yang
 * dibungkus .lkps-klasik. Konten diberi key prodi aktif supaya halaman klien memuat ulang data saat prodi diganti.
 */
export default async function LayoutLkps({ children }: LayoutProps<"/lkps">) {
  const p = await wajibPeran("ADMIN", "TIM_PRODI", "ASESOR");
  const [prodiId, daftar] = await Promise.all([prodiAktifHalaman(p), pilihanProdiLkps(p)]);
  const namaProdi = daftar.find((d) => d.id === prodiId)?.label ?? null;
  return (
    <ShellLkps pengguna={p}>
      <PenyediaLkps nilai={{ peran: p.peran, prodiId, namaProdi }}>
        <div className="flex flex-col gap-6">
          {p.peran !== "TIM_PRODI" && <PemilihProdi daftar={daftar} aktif={prodiId} />}
          <div key={prodiId ?? "-"} className="lkps-klasik flex flex-col gap-6">{children}</div>
        </div>
      </PenyediaLkps>
    </ShellLkps>
  );
}
