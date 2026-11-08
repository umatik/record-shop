import { NextResponse, type NextRequest } from "next/server";
import { API_URL, SESSION_COOKIE, canUsePanel, sessionCookieOptions } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  const loginResponse = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  if (!loginResponse) {
    return NextResponse.json({ message: "Brak połączenia z API. Sprawdź, czy działa." }, { status: 502 });
  }
  if (loginResponse.status === 429) {
    return NextResponse.json({ message: "Za dużo prób logowania. Spróbuj za chwilę." }, { status: 429 });
  }
  if (!loginResponse.ok) {
    return NextResponse.json({ message: "Nieprawidłowy e-mail lub hasło." }, { status: 401 });
  }

  const { token } = (await loginResponse.json()) as { token: string };

  const meResponse = await fetch(`${API_URL}/users/me`, { headers: { authorization: `Bearer ${token}` } });
  const me = (await meResponse.json()) as { permissions?: string[] };
  if (!meResponse.ok || !canUsePanel(me.permissions ?? [])) {
    return NextResponse.json({ message: "To konto nie ma dostępu do panelu." }, { status: 403 });
  }

  const response = NextResponse.json({ message: "Zalogowano" });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
