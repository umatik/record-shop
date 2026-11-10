import { NextRequest, NextResponse } from "next/server";
import { apiOrigin, sessionName, setSession } from "@/lib/shop-session";
import { isLocale } from "@/app/messages";
type Context = RouteContext<"/api/account/[action]">;
const forwards: Record<string, string> = {
  "email-available": "/customer/email-available",
  "password-reset-request": "/customer/password-reset/request",
  "password-reset-confirm": "/customer/password-reset/confirm",
};
export async function POST(req: NextRequest, { params }: Context) {
  const { action } = await params;
  if (req.headers.get("origin") !== (process.env.SHOP_ORIGIN ?? req.nextUrl.origin))
    return new Response(null, { status: 403 });
  if (action === "logout") {
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(sessionName);
    return response;
  }
  const forwarded = forwards[action];
  if (forwarded) {
    try {
      const result = await fetch(new URL(forwarded, apiOrigin), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(await req.json()),
        signal: AbortSignal.timeout(8000),
      });
      if (result.status === 204) return new Response(null, { status: 204 });
      if (!result.ok) return new Response(null, { status: result.status });
      return NextResponse.json(await result.json());
    } catch {
      return new Response(null, { status: 503 });
    }
  }
  if (action !== "login" && action !== "register") return new Response(null, { status: 404 });
  try {
    const result = await fetch(new URL(action === "login" ? "/login" : "/customer/register", apiOrigin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await req.json()),
      signal: AbortSignal.timeout(12000),
    });
    if (!result.ok) return new Response(null, { status: result.status });
    return setSession(NextResponse.json({ ok: true }), (await result.json()).token);
  } catch {
    return new Response(null, { status: 503 });
  }
}
export async function GET(req: NextRequest, { params }: Context) {
  const { action } = await params;
  if (action === "session") {
    const token = req.cookies.get(sessionName)?.value;
    if (!token) return NextResponse.json({ email: null });
    const me = await fetch(new URL("/users/me", apiOrigin), {
      headers: { authorization: "Bearer " + token },
      cache: "no-store",
    });
    return NextResponse.json({ email: me.ok ? (await me.json()).user?.email : null });
  }
  if (action === "shipping") {
    const token = req.cookies.get(sessionName)?.value;
    if (!token) return new Response(null, { status: 401 });
    const result = await fetch(new URL("/customer/me/shipping", apiOrigin), {
      headers: { authorization: "Bearer " + token },
      cache: "no-store",
    });
    if (!result.ok) return new Response(null, { status: result.status });
    return NextResponse.json(await result.json());
  }
  if (action !== "apple" && action !== "google") return new Response(null, { status: 404 });
  const requested = req.nextUrl.searchParams.get("lang") ?? "pl";
  const lang = isLocale(requested) ? requested : "pl";
  const origin = process.env.SHOP_ORIGIN ?? req.nextUrl.origin;
  try {
    const r = await fetch(new URL("/customer/" + action + "/start", apiOrigin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: lang }),
    });
    if (!r.ok) throw Error();
    const { url, browserKey } = await r.json();
    const response = NextResponse.redirect(url);
    response.cookies.set("rasbass-" + action, browserKey + "." + lang, {
      httpOnly: true,
      secure: action === "apple" || origin.startsWith("https:"),
      sameSite: action === "apple" ? "none" : "lax",
      path: "/api/account/" + action + "/callback",
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/" + lang + "/login?error=provider", origin));
  }
}
