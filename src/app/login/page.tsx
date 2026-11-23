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
import { asetLogin } from "./aset";

export const metadata: Metadata = { title: "Masuk" };

/**
 * Halaman masuk (Rencana 18 Nov S3, desain Figma "Revisi 18 Nov" L1–L3): kartu dua kolom di layar lebar, satu kolom di
 * ponsel; kanan form. Kiri (permintaan Adrianne 23 Nov 2026, mengubah aturan "tanpa foto/logo" di rencana): foto latar
 * dan logo LAM Teknik dalam lingkaran seperti apps.unila.ac.id, bila berkasnya ada di public/login/; bila belum, panel
 * biru identitas aplikasi. Tombol SSO hanya bila SSO_AKTIF=true; pesan galat SSO dari `?galat=<kode>` teks tetap.
 */
export default async function HalamanLogin({ searchParams }: PageProps<"/login">) {
  const p = await ambilPengguna();
  if (p) redirect(berandaPeran(p.peran));
  const { ke, galat } = await searchParams;
  // revisi 23 Okt 2026: pemasangan pertama membuat admin dari sini, bukan dari .env
  const [pertama, fakultas] = await Promise.all([perluAdminPertama(), ambilFakultas()]);
  const sso = ssoAktif();
  const aset = asetLogin();
  const namaFakultas = fakultas?.nama || "Fakultas";
  const pt = fakultas?.perguruanTinggi;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {aset.latar || aset.logo ? (
          <aside
            className="relative flex min-h-48 items-center justify-center overflow-hidden bg-primary md:min-h-[32rem]"
            aria-label="Akreditasi LAM Teknik"
          >
            {/* foto latar diburamkan dan diredam abu (permintaan Adrianne 23 Nov 2026) supaya fokus ke logo; scale-110 agar
                tepi yang ikut buram tidak terlihat */}
            {aset.latar && (
              <div
                data-latar-login
                className="absolute inset-0 scale-110 bg-cover bg-center blur-[6px] grayscale-[35%]"
                style={{ backgroundImage: `url(${aset.latar})` }}
                aria-hidden
              />
            )}
            <div className="absolute inset-0 bg-slate-900/35" aria-hidden />
            {aset.logo && (
              <div className="relative flex size-32 items-center justify-center rounded-full bg-white p-4 shadow-lg ring-4 ring-white/50 md:size-44 md:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- berkas lokal kecil di public/login, ukurannya tetap */}
                <img src={aset.logo} alt="Logo LAM Teknik" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </aside>
        ) : (
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
        )}
        <main className="flex flex-col justify-center p-6 md:p-10">
          {(aset.latar || aset.logo) && (
            <div className="mb-6 flex flex-col gap-1 text-center">
              <h1 className="text-xl font-semibold tracking-tight">Akreditasi LAM Teknik</h1>
              <p className="text-sm text-muted-foreground">LKPS dan LED · UPPS {namaFakultas}{pt ? `, ${pt}` : ""}</p>
            </div>
          )}
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
