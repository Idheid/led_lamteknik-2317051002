import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Pemeriksaan optimistis: tanpa cookie sesi, arahkan ke /login.
 * Pemeriksaan sesi dan peran yang sebenarnya dilakukan di layout (wajibSuperAdmin/wajibPenanggungJawab)
 * dan di setiap aksi server (lapisan data menerima Pengguna dan memeriksa peran serta prodiId).
 */
export function proxy(request: NextRequest) {
  const adaSesi = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;
  if (!adaSesi && pathname !== "/login") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("ke", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Semua halaman kecuali API auth, aset Next.js, dan berkas statis.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
