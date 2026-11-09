import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "rs_admin_session";

/** Szybkie sprawdzenie: bez ciasteczka sesji strony panelu przekierowują do logowania. */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLogin = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Bez tras serwera panelu, plików Nexta, zdjęć z API i plików statycznych (wszystko z rozszerzeniem, np. logo, wzory).
  matcher: ["/((?!api|_next|uploads|.*\\.[a-z0-9]+$).*)"],
};
