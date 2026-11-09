export type CreateOrderItemData = {
  productVariantId: number;
  quantity: number;
};

export type CreateOrderData = {
  userId: number;
  items: CreateOrderItemData[];
};

export type Order = {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: number;
  productVariantId: number;
  quantity: number;
  /** Cena jednostkowa w eurocentach z chwili złożenia zamówienia. */
  priceEur: number;
  productId: number;
  productTitle: string;
  variantAttributes: Record<string, unknown>;
};

export type OrderDetails = Order & {
  items: OrderItem[];
};

export type OrderRow = {
  orderId: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  itemId: number | null;
  productVariantId: number | null;
  quantity: number | null;
  priceEur: number | null;
  productId: number | null;
  productTitle: string;
  variantAttributes: Record<string, unknown>;
};

// Obsługa zamówień w panelu (docs/sprzedaz.md).

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderBuyer = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
};

export type ManagedOrderItem = OrderItem & {
  /** Ścieżka zdjęcia głównego wariantu (jak `url` w mediach), do miniatury w panelu. */
  photoUrl: string | null;
  artists: string[];
};

export type ManagedOrder = {
  id: number;
  status: OrderStatus;
  /** Suma pozycji w eurocentach. */
  totalEur: number;
  buyer: OrderBuyer;
  items: ManagedOrderItem[];
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
};

export type ManagedOrderFilters = {
  status?: OrderStatus | undefined;
  /** Opłacone do wysłania pokazujemy od najstarszych: kupujący czeka najdłużej. */
  sort: "newest" | "oldest";
  page: number;
  limit: number;
};
