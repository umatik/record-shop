import { NextResponse, type NextRequest } from "next/server";
import { API_URL, SESSION_COOKIE } from "@/lib/server/session";

/**
 * Pośrednik do API: dokleja token z ciasteczka i przekazuje żądanie dalej bez zmian
 * (także multipart ze zdjęciami). Przeglądarka nie zna tokenu ani adresu API.
 */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Sesja wygasła" }, { status: 401 });
  }

  const { path } = await params;
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers({ authorization: `Bearer ${token}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const apiResponse = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : null,
    cache: "no-store",
  }).catch(() => null);

  if (!apiResponse) {
    return NextResponse.json({ message: "Brak połączenia z API" }, { status: 502 });
  }

  const response = new NextResponse(apiResponse.body, {
    status: apiResponse.status,
    headers: { "content-type": apiResponse.headers.get("content-type") ?? "application/json" },
  });
  // Wygasły token: czyścimy ciasteczko, panel wróci do logowania.
  if (apiResponse.status === 401) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
