import { NextResponse, type NextRequest } from "next/server";
import { konfigurasiSso, ssoAktif } from "@/modules/bersama/sso/konfigurasi";
import { PERSONA_TIRUAN, buatTiketTiruan, type KunciPersona } from "@/modules/bersama/sso/tiruan";
import type { HasilSso } from "@/modules/bersama/sso/penyedia";
import { alamat } from "../bantu";

/**
 * Halaman penyedia SSO tiruan (Rencana 18 Nov S5), hanya untuk pengembangan dan uji. Mati (404) bila
 * `NODE_ENV=production`, SSO mati, atau `SSO_MODE` bukan `tiruan`.
 * GET: pilihan pengguna palsu. POST: buat tiket bertanda lalu alihkan ke `/api/sso/kembali?tiket=…&state=…`.
 */
function hidup(): boolean {
  if (process.env.NODE_ENV === "production" || !ssoAktif()) return false;
  try {
    return konfigurasiSso().mode === "tiruan";
  } catch {
    return false;
  }
}

const tidakAda = () => new NextResponse("Tidak ditemukan.", { status: 404 });

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function GET(req: NextRequest) {
  if (!hidup()) return tidakAda();
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const persona = Object.entries(PERSONA_TIRUAN)
    .map(([k, p]) => `
      <button name="persona" value="${esc(k)}" class="p">
        <b>${esc(p.judul)}</b><span>${esc(p.hasil.nama)} · ${esc(p.hasil.username)}</span><small>${esc(p.keterangan)}</small>
      </button>`)
    .join("");
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSO Unila tiruan</title><style>
body{font-family:system-ui,sans-serif;background:#f1f5f9;color:#0f172a;margin:0;padding:24px}
main{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px #0002}
h1{font-size:20px;margin:0 0 4px}p{color:#475569;font-size:14px;margin:0 0 16px}
.peringatan{background:#fef3c7;color:#78350f;border-radius:8px;padding:8px 12px;font-size:13px}
.p{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left;border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:12px;margin:0 0 8px;cursor:pointer;font:inherit}
.p:hover{border-color:#1d4ed8;background:#eff6ff}.p span{font-size:13px;color:#334155}.p small{font-size:12px;color:#64748b}
fieldset{border:1px solid #cbd5e1;border-radius:8px;margin-top:16px;padding:12px;display:grid;gap:8px}
label{font-size:13px;display:grid;gap:4px}input,select{font:inherit;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px}
.k{background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:8px 12px;font:inherit;cursor:pointer}
</style></head><body><main>
<h1>SSO Unila (tiruan)</h1>
<p class="peringatan">Penyedia palsu untuk pengembangan dan uji. Tidak tersedia di server produksi.</p>
<p>Pilih pengguna untuk mensimulasikan login SSO.</p>
<form method="post"><input type="hidden" name="state" value="${esc(state)}">${persona}</form>
<form method="post"><input type="hidden" name="state" value="${esc(state)}">
<fieldset><legend>Pengguna lain</legend>
<label>UNILA ID <input name="username" required></label>
<label>Nama <input name="nama" required></label>
<label>Email <input name="email" type="email"></label>
<label>Status <select name="status"><option>dosen</option><option>tendik</option><option>mahasiswa</option></select></label>
<label><span><input type="checkbox" name="aktif" value="1" checked> Akun SSO aktif</span></label>
<button class="k">Masuk sebagai pengguna ini</button>
</fieldset></form>
</main></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!hidup()) return tidakAda();
  const f = await req.formData();
  const teks = (k: string) => (typeof f.get(k) === "string" ? String(f.get(k)).trim() : "");
  let hasil: HasilSso;
  const kunci = teks("persona");
  if (kunci) {
    if (!Object.hasOwn(PERSONA_TIRUAN, kunci)) return new NextResponse("Pengguna tiruan tidak dikenal.", { status: 400 });
    hasil = { ...PERSONA_TIRUAN[kunci as KunciPersona].hasil };
  } else {
    if (!teks("username") || !teks("nama")) return new NextResponse("UNILA ID dan nama wajib diisi.", { status: 400 });
    hasil = { username: teks("username"), nama: teks("nama"), email: teks("email") || null, aktif: teks("aktif") === "1", status: teks("status") || null };
  }
  const u = alamat(req, "/api/sso/kembali");
  u.searchParams.set("tiket", buatTiketTiruan(hasil));
  u.searchParams.set("state", teks("state"));
  return NextResponse.redirect(u, 303);
}
