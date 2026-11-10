import { getCatalog } from "@/services/catalog";
export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get("page"));
  if (!Number.isSafeInteger(page) || page < 1) return new Response(null, { status: 400 });
  try {
    return Response.json(await getCatalog(page, new URL(request.url).searchParams.get("sort") ?? "newest"));
  } catch {
    return new Response(null, { status: 502 });
  }
}
