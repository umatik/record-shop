import "server-only";

export const API_URL = process.env.API_URL ?? "http://localhost:3000";

/** Ciasteczko z tokenem JWT z API. httpOnly: JavaScript strony go nie widzi. */
export const SESSION_COOKIE = "rs_admin_session";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // Bez maxAge: ciasteczko sesyjne, znika po zamknięciu przeglądarki. Token z API i tak wygasa po swoim czasie.
} as const;

/** Panel wpuszcza tylko osoby, które mogą zarządzać produktami. */
export function canUsePanel(permissions: string[]): boolean {
  return permissions.some((permission) => permission.startsWith("products:"));
}
