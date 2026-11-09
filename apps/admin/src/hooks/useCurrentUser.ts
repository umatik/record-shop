import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/session.services";
import { sessionKeys } from "./queryKeys";

export function useCurrentUser() {
  return useQuery({ queryKey: sessionKeys.me, queryFn: getCurrentUser, staleTime: Infinity });
}
