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

/** Zawężenie listy zamówień w panelu (historia zamówień). */
export type ManagedOrderScope = {
  status?: OrderStatus | undefined;
  /** Zakres dat złożenia zamówienia (`YYYY-MM-DD`, oba dni włącznie), liczony w czasie sklepu. */
  from?: string | undefined;
  to?: string | undefined;
  /** Kupujący (imię, nazwisko, e-mail) albo numer zamówienia. */
  q?: string | undefined;
};

export type ManagedOrderFilters = ManagedOrderScope & {
  sort: ManagedOrderSort;
  page: number;
  limit: number;
};

/**
 * `newest` i `oldest` sortują po dacie złożenia. `paid_oldest` to kolejka wysyłek: od najdłużej czekających
 * od opłacenia (zamówienie złożone wcześniej mogło zostać opłacone później).
 */
export const MANAGED_ORDER_SORTS = ["newest", "oldest", "paid_oldest"] as const;
export type ManagedOrderSort = (typeof MANAGED_ORDER_SORTS)[number];

// Pulpit panelu (docs/pulpit-claude.md).

/** Okresy statystyk sprzedaży na pulpicie, w dniach (z dzisiejszym). */
export const SALES_PERIODS = [7, 30] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

/** Statusy liczone jako opłacona sprzedaż: wysłane i doręczone zamówienie nadal jest sprzedane. */
export const SOLD_STATUSES = ["paid", "shipped", "delivered"] as const satisfies readonly OrderStatus[];

/** Bieżąca praca: stan na teraz, niezależny od okresu. */
export type OrderQueueSummary = {
  toShip: {
    count: number;
    /** Czas opłacenia najdłużej czekającego zamówienia. */
    oldestPaidAt: string | null;
  };
  pending: {
    count: number;
    /** Wartość produktów w eurocentach. */
    totalEur: number;
    oldestCreatedAt: string | null;
  };
  /** Opłacone zamówienia bez czasu opłacenia: nie da się ich przypisać do dnia, więc nie ma ich w sprzedaży. */
  soldWithoutPaidAt: number;
};

/** Sprzedaż jednego dnia kalendarzowego w strefie Europe/Warsaw. */
export type SalesDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Wartość produktów w eurocentach (cena z chwili zakupu × ilość). */
  totalEur: number;
  orders: number;
  units: number;
};

export type OrderSummary = OrderQueueSummary & {
  sales: {
    days: SalesPeriod;
    totalEur: number;
    orders: number;
    units: number;
    /** Każdy dzień okresu, także bez sprzedaży, od najstarszego. */
    daily: SalesDay[];
  };
};
