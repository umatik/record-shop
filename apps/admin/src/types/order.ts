import type { Pagination } from "./common";

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

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

export type OrderItem = {
  id: number;
  productId: number;
  productVariantId: number;
  productTitle: string;
  artists: string[];
  quantity: number;
  /** Eurocenty z chwili zakupu. */
  priceEur: number;
  photoUrl: string | null;
  variantAttributes: Record<string, unknown>;
};

export type Order = {
  id: number;
  status: OrderStatus;
  /** Eurocenty. */
  totalEur: number;
  buyer: OrderBuyer;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
};

export type OrderList = {
  orders: Order[];
  pagination: Pagination;
};

export type OrderListFilters = {
  status: OrderStatus;
  sort: "oldest" | "newest";
};
