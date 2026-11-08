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
  matcher: ["/((?!api|_next|uploads|logo.png|favicon.ico).*)"],
};
