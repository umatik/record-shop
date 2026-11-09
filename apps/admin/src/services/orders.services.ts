import type { Order, OrderList, OrderListFilters, OrderSummary, SalesPeriod } from "@/types/order";
import { request, toQuery } from "./http";

export function getOrders({ status, sort }: OrderListFilters, page: number, limit: number) {
  return request<OrderList>(`/orders/manage?${toQuery({ status, sort, page, limit })}`);
}

export function getOrderSummary(days: SalesPeriod) {
  return request<OrderSummary>(`/orders/manage/summary?${toQuery({ days })}`);
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
