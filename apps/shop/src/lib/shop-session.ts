import "server-only";
import { NextResponse } from "next/server";
export const apiOrigin = process.env.API_URL ?? "http://localhost:3000";
export const sessionName = "rasbass-shop-session";
export function setSession(response: NextResponse, token: string) {
  response.cookies.set(sessionName, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.SHOP_ORIGIN?.startsWith("https://"),
  });
  return response;
}
