import type { ApiFieldError } from "@/types/common";

/** Błąd z API: zawsze ma `message`, przy walidacji także `errors`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: ApiFieldError[] = [],
    /** Pełna odpowiedź, gdy wywołujący potrzebuje czegoś więcej niż komunikatu. */
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
};

/**
 * Jedyne miejsce, które rozmawia z API. Żądania idą przez pośrednika panelu (`/api/proxy`),
 * który dokleja token z ciasteczka. Wygasła sesja przenosi do logowania.
 */
export async function request<T>(path: string, { method = "GET", json, form }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    method,
    ...(json !== undefined && { headers: { "content-type": "application/json" }, body: JSON.stringify(json) }),
    ...(form && { body: form }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (response.status === 401 && typeof window !== "undefined") {
    // Pełne przeładowanie celowo: czyści cache zapytań po poprzedniej sesji.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?expired=1");
  }
  if (!response.ok) {
    const message = typeof body.message === "string" ? body.message : "Coś poszło nie tak";
    const errors = Array.isArray(body.errors) ? (body.errors as ApiFieldError[]) : [];
    throw new ApiError(message, response.status, errors, body);
  }
  return body as T;
}

/** Parametry zapytania bez pustych wartości. */
export function toQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && String(value).trim() !== "");
  return new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
}
