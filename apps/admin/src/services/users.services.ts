import type { UserList } from "@/types/user";
import { request, toQuery } from "./http";

export function getUsers(page: number, limit: number) {
  return request<UserList>(`/users?${toQuery({ page, limit })}`);
}

export function deleteUser(userId: number) {
  return request<{ message: string }>(`/users/${userId}`, { method: "DELETE" });
}
