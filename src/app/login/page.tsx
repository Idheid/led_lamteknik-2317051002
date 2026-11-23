import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { ambilPengguna } from "@/modules/bersama/sesi";
import { berandaPeran } from "@/modules/bersama/peran";
import { ambilFakultas } from "@/modules/bersama/data/organisasi";
import { perluAdminPertama } from "@/modules/bersama/data/pemasangan";
import { ssoAktif } from "@/modules/bersama/sso/konfigurasi";
import { pesanGalatSso } from "@/modules/bersama/sso/pesan";
import { FormLogin } from "./form-login";
import { FormAdminPertama } from "./form-admin-pertama";

export const metadata: Metadata = { title: "Masuk" };

/**
 * Halaman masuk (Rencana 18 Nov S3, desain Figma "Revisi 18 Nov" L1–L3): kartu dua kolom di layar lebar, satu kolom di
 * ponsel. Kiri panel identitas aplikasi (tanpa logo Unila/LAM Teknik), kanan form. Tombol SSO hanya bila SSO_AKTIF=true;
 * pesan galat SSO dari `?galat=<kode>` dipetakan ke teks tetap.
 */
export default async function HalamanLogin({ searchParams }: PageProps<"/login">) {
  const p = await ambilPengguna();
  if (p) redirect(berandaPeran(p.peran));
  const { ke, galat } = await searchParams;
  // revisi 23 Okt 2026: pemasangan pertama membuat admin dari sini, bukan dari .env
  const [pertama, fakultas] = await Promise.all([perluAdminPertama(), ambilFakultas()]);
  const sso = ssoAktif();
  const namaFakultas = fakultas?.nama || "Fakultas";
  const pt = fakultas?.perguruanTinggi;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="flex flex-col gap-6 bg-primary p-6 text-primary-foreground md:p-10">
          <div className="flex flex-col gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15">
              <FileText className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Akreditasi LAM Teknik</h1>
              <p className="text-sm text-primary-foreground/85">LKPS dan LED untuk akreditasi program studi {namaFakultas}.</p>
            </div>
          </div>
          <dl className="mt-auto hidden flex-col gap-3 text-sm md:flex">
            <div>
              <dt className="font-medium">Login biasa</dt>
              <dd className="text-primary-foreground/85">Akun yang dibuat Admin UPPS (email dan kata sandi).</dd>
            </div>
            {sso && (
              <div>
                <dt className="font-medium">SSO Unila</dt>
                <dd className="text-primary-foreground/85">Dosen dan tenaga kependidikan dengan UNILA ID.</dd>
              </div>
            )}
            <dd className="text-xs text-primary-foreground/75">UPPS {namaFakultas}{pt ? ` · ${pt}` : ""}</dd>
          </dl>
        </aside>
        <main className="flex flex-col justify-center p-6 md:p-10">
          {pertama
            ? <FormAdminPertama />
            : <FormLogin tujuan={typeof ke === "string" ? ke : undefined} sso={sso} galatSso={pesanGalatSso(galat)} />}
        </main>
      </div>
      {!pertama && (
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Akun dibuat oleh Admin UPPS. Lupa kata sandi? Hubungi Admin UPPS untuk mengatur ulang.
        </p>
      )}
    </div>
  );
}
