import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, getOrder, getOrderSummary, getOrders, markOrderPaid } from "@/services/orders.services";
import type { Order, OrderListFilters, SalesPeriod } from "@/types/order";
import { orderKeys, productKeys } from "./queryKeys";

const PAGE_SIZE = 50;

/** Lista zamówień ładowana stronami; `total` to pełna liczba, także ponad to, co już pobrane. */
export function useOrderList(filters: OrderListFilters, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: orderKeys.list(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getOrders(filters, pageParam, PAGE_SIZE),
    getNextPageParam: ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined),
    enabled,
  });

  return {
    ...query,
    orders: query.data?.pages.flatMap((page) => page.orders) ?? [],
    total: query.data?.pages[0]?.pagination.total,
  };
}

/**
 * Liczby pulpitu. Przy zmianie okresu zostają poprzednie wartości do czasu nadejścia nowych, żeby liczniki
 * bieżącej pracy nie mrugały. Klucz leży pod `orderKeys.all`, więc zmiana statusu zamówienia go odświeża.
 */
export function useOrderSummary(days: SalesPeriod, enabled = true) {
  return useQuery({
    queryKey: orderKeys.summary(days),
    queryFn: () => getOrderSummary(days),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useOrder(orderId: number) {
  return useQuery({ queryKey: orderKeys.detail(orderId), queryFn: () => getOrder(orderId) });
}

/**
 * Po zmianie statusu: świeże zamówienie w cache, odświeżone listy i podsumowanie zamówień oraz płyty
 * (anulowanie zwraca płyty na stan).
 */
function useOrderMutation<TArgs>(orderId: number, mutationFn: (args: TArgs) => Promise<Order>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(orderId), order);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
    },
  });
}

export function useMarkOrderPaid(orderId: number) {
  return useOrderMutation(orderId, () => markOrderPaid(orderId));
}

export function useCancelOrder(orderId: number) {
  return useOrderMutation(orderId, (reason: string) => cancelOrder(orderId, reason));
}
