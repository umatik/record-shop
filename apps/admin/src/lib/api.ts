/** Błąd z API: zawsze ma `message`, przy walidacji także `errors`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** Żądanie do API przez pośrednika panelu (`/api/proxy`), który dokleja token z ciasteczka. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, init);
  const body = (await response.json().catch(() => ({}))) as { message?: string; errors?: [] };

  if (response.status === 401 && typeof window !== "undefined") {
    // Pełne przeładowanie celowo: czyści cache zapytań po poprzedniej sesji.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?expired=1");
  }
  if (!response.ok) {
    throw new ApiError(body.message ?? "Coś poszło nie tak", response.status, body.errors);
  }
  return body as T;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- czyści cache zapytań
  window.location.assign("/login");
}
