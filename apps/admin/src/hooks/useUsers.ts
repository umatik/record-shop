import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser, getUsers } from "@/services/users.services";
import { userKeys } from "./queryKeys";

const PAGE_SIZE = 50;

/** Lista użytkowników ładowana stronami; `total` to pełna liczba, także ponad to, co już pobrane. */
export function useUserList() {
  const query = useInfiniteQuery({
    queryKey: userKeys.list(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getUsers(pageParam, PAGE_SIZE),
    getNextPageParam: ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined),
  });

  return {
    ...query,
    users: query.data?.pages.flatMap((page) => page.users) ?? [],
    total: query.data?.pages[0]?.pagination.total,
  };
}

/** Usunięcie konta; po sukcesie lista użytkowników ładuje się od nowa. */
export function useDeleteUser(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
