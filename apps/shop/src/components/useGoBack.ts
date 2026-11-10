"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

/** Goes back in browser history; opens `fallback` when there is no earlier page in this tab. */
export function useGoBack(fallback: string) {
  const router = useRouter();
  return useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}
