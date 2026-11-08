import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";

export async function POST() {
  const response = NextResponse.json({ message: "Wylogowano" });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
