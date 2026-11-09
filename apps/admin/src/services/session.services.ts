import type { CurrentUser } from "@/types/session";
import { request } from "./http";

export function getCurrentUser() {
  return request<CurrentUser>("/users/me");
}

/** Wylogowanie usuwa ciasteczko sesji po stronie panelu. */
export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  // Pełne przeładowanie czyści cache zapytań.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}

/**
 * Logowanie przez serwer panelu: zapisuje token w ciasteczku `httpOnly`, przeglądarka go nie widzi.
 * Zwraca komunikat błędu do pokazania albo `null`, gdy się udało.
 */
export async function login(email: string, password: string): Promise<string | null> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  if (response?.ok) return null;
  const body = (await response?.json().catch(() => ({}))) as { message?: string } | undefined;
  return body?.message ?? "Nie udało się zalogować. Sprawdź połączenie.";
}
