import type { OrderStatus } from "@/types/order";

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Czeka na płatność", color: "yellow" },
  paid: { label: "Opłacone, do wysłania", color: "blue" },
  shipped: { label: "Wysłane", color: "green" },
  delivered: { label: "Doręczone", color: "green" },
  cancelled: { label: "Anulowane", color: "gray" },
};

/** Przed wysyłką zamówienie można anulować. */
export const canCancel = (status: OrderStatus) => status === "pending" || status === "paid";
