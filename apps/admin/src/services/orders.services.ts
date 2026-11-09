import type { Order, OrderList, OrderListFilters, OrderSummary, SalesPeriod } from "@/types/order";
import { request, toQuery } from "./http";

export function getOrders({ status, sort, from, to, q }: OrderListFilters, page: number, limit: number) {
  return request<OrderList>(`/orders/manage?${toQuery({ status, sort, from, to, q, page, limit })}`);
}

/** Adres pobrania eksportu (CSV albo PDF) z tymi samymi filtrami co lista; plik ściąga przeglądarka. */
export function orderExportHref(filters: OrderListFilters, format: "csv" | "pdf") {
  return `/api/proxy/orders/manage/export?${toQuery(exportQuery(filters, format))}`;
}

/** Wysyła eksport mailem na adres z konfiguracji API. */
export function sendOrdersExport(filters: OrderListFilters, format: "csv" | "pdf") {
  return request<{ message: string; filename: string; orders: number }>(
    `/orders/manage/export/email?${toQuery(exportQuery(filters, format))}`,
    { method: "POST" },
  );
}

const exportQuery = ({ status, from, to, q }: OrderListFilters, format: "csv" | "pdf") => ({
  format,
  status: status ?? "all",
  from,
  to,
  q,
});

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
