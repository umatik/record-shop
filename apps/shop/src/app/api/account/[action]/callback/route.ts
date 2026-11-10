import { NextRequest, NextResponse } from "next/server";
import { apiOrigin, setSession } from "@/lib/shop-session";
import { isLocale } from "@/app/messages";
async function callback(req: NextRequest, { params }: RouteContext<"/api/account/[action]/callback">) {
  const { action } = await params;
  if (action !== "apple" && action !== "google") return new Response(null, { status: 404 });
  const [browserKey, locale] = (req.cookies.get("rasbass-" + action)?.value ?? "").split(".");
  const lang = locale && isLocale(locale) ? locale : "pl";
  const origin = process.env.SHOP_ORIGIN ?? req.nextUrl.origin;
  const failure = NextResponse.redirect(new URL("/" + lang + "/login?error=provider", origin), 303);
  if (!browserKey) return failure;
  try {
    const data = req.method === "POST" ? await req.formData() : req.nextUrl.searchParams;
    const r = await fetch(new URL("/customer/" + action + "/finish", apiOrigin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: data.get("code"), state: data.get("state"), browserKey }),
    });
    if (!r.ok) return failure;
    const { token } = await r.json();
    const response = setSession(
      NextResponse.redirect(new URL("/" + lang + "/login?complete=" + action, origin), 303),
      token,
    );
    response.cookies.set("rasbass-" + action, "", { path: "/api/account/" + action + "/callback", maxAge: 0 });
    return response;
  } catch {
    return failure;
  }
}
export { callback as GET, callback as POST };
