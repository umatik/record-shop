import type { OrderListFilters } from "@/types/order";
import type { ProductStatus } from "@/types/product";

/**
 * Wszystkie klucze zapytań w jednym miejscu. Unieważnianie po zapisie trafia w całe gałęzie
 * (`productKeys.all`), więc nie trzeba pamiętać, które listy pokazują dany produkt.
 */
export const productKeys = {
  all: ["products"] as const,
  list: (status: ProductStatus, q: string) => [...productKeys.all, "list", status, q] as const,
  count: (status: ProductStatus) => [...productKeys.all, "count", status] as const,
  detail: (productId: number) => [...productKeys.all, "detail", productId] as const,
};

export const orderKeys = {
  all: ["orders"] as const,
  list: (filters: OrderListFilters) => [...orderKeys.all, "list", filters] as const,
  detail: (orderId: number) => [...orderKeys.all, "detail", orderId] as const,
};

export const sessionKeys = {
  me: ["session", "me"] as const,
};
