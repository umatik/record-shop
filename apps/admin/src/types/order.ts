import type { Pagination } from "./common";

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export type OrderBuyer = {
  id: number | null;
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
  /** Bez statusu: wszystkie zamówienia (historia). */
  status?: OrderStatus;
  /** Zakres dat złożenia (`YYYY-MM-DD`, oba dni włącznie, czas polski). */
  from?: string;
  to?: string;
  /** Kupujący (imię, nazwisko, e-mail) albo numer zamówienia. */
  q?: string;
  /** `paid_oldest`: kolejka wysyłek, od najdłużej czekających od opłacenia; pozostałe po dacie złożenia. */
  sort: "oldest" | "newest" | "paid_oldest";
};

/** Okres statystyk sprzedaży na pulpicie, w dniach (z dzisiejszym). */
export type SalesPeriod = 7 | 30;

/** Sprzedaż jednego dnia kalendarzowego (czas polski). */
export type SalesDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Eurocenty. */
  totalEur: number;
  orders: number;
  units: number;
};

/** Liczby pulpitu z `GET /orders/manage/summary`. Kolejka i płatności to stan na teraz, sprzedaż dotyczy okresu. */
export type OrderSummary = {
  toShip: { count: number; oldestPaidAt: string | null };
  pending: { count: number; totalEur: number; oldestCreatedAt: string | null };
  /** Opłacone zamówienia bez czasu opłacenia: nie ma ich w sprzedaży. */
  soldWithoutPaidAt: number;
  sales: {
    days: SalesPeriod;
    totalEur: number;
    orders: number;
    units: number;
    daily: SalesDay[];
  };
};
