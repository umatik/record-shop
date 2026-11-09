import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, getOrder, getOrders, markOrderPaid } from "@/services/orders.services";
import type { Order, OrderListFilters } from "@/types/order";
import { orderKeys, productKeys } from "./queryKeys";

export function useOrders(filters: OrderListFilters) {
  return useQuery({ queryKey: orderKeys.list(filters), queryFn: () => getOrders(filters) });
}

export function useOrder(orderId: number) {
  return useQuery({ queryKey: orderKeys.detail(orderId), queryFn: () => getOrder(orderId) });
}

/** Po zmianie statusu: świeże zamówienie w cache, odświeżone listy zamówień i płyt (anulowanie zwraca płyty). */
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
