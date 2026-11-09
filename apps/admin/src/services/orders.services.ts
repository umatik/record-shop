import type { Order, OrderList, OrderListFilters } from "@/types/order";
import { request, toQuery } from "./http";

/** Pulpit pokazuje najwyżej tyle zamówień w jednej sekcji; licznik i tak podaje pełną liczbę. */
export const DASHBOARD_ORDER_LIMIT = 50;

export function getOrders({ status, sort }: OrderListFilters) {
  return request<OrderList>(`/orders/manage?${toQuery({ status, sort, limit: DASHBOARD_ORDER_LIMIT })}`);
}

export async function getOrder(orderId: number) {
  const { order } = await request<{ order: Order }>(`/orders/manage/${orderId}`);
  return order;
}

export async function markOrderPaid(orderId: number) {
  const { order } = await request<{ order: Order }>(`/orders/${orderId}/mark-paid`, { method: "POST" });
  return order;
}

export async function cancelOrder(orderId: number, reason: string) {
  const { order } = await request<{ order: Order }>(`/orders/${orderId}/cancel`, { method: "POST", json: { reason } });
  return order;
}
