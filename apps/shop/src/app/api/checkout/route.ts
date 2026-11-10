import { cookies } from "next/headers";
import { sessionName } from "@/lib/shop-session";
export async function POST(request: Request) {
  try {
    const token=(await cookies()).get(sessionName)?.value;
    const response = await fetch(new URL("/orders/checkout", process.env.API_URL ?? "http://localhost:3000"), {
      method: "POST", headers: { "Content-Type": "application/json", ...(token && {authorization:"Bearer "+token}) },
      body: JSON.stringify(await request.json()), signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);
    return Response.json(response.ok ? body : { error: "Checkout failed", code: body?.code ?? null }, { status: response.status });
  } catch {
    return Response.json({ error: "Checkout unavailable" }, { status: 503 });
  }
}
