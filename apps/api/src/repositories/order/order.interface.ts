import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  ManagedOrder,
  ManagedOrderFilters,
  ManagedOrderScope,
  Order,
  OrderDetails,
  OrderQueueSummary,
  OrderStatus,
  SalesDay,
  SalesPeriod,
} from "../../types/order.types.js";

export interface OrderInterface {
  create(client: PoolClient, data: CreateOrderData): Promise<Order>;

  findAll(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<OrderDetails[]>;

  createItems(
    client: PoolClient,
    orderId: number,
    items: CreateOrderItemData[],
  ): Promise<void>;

  findUserById(client: PoolClient, userId: number): Promise<boolean>;

  findByUserId(client: PoolClient, userId: number): Promise<OrderDetails[]>;

  findById(
    client: PoolClient,
    orderId: number,
    userId: number,
  ): Promise<OrderDetails | null>;

  countAll(client: PoolClient): Promise<number>;

  delete(
    client: PoolClient,
    orderId: number,
    userId?: number,
  ): Promise<boolean>;

  // Obsługa zamówień w panelu.

  countManaged(client: PoolClient, scope: ManagedOrderScope): Promise<number>;

  findManaged(client: PoolClient, filters: ManagedOrderFilters): Promise<ManagedOrder[]>;

  findManagedById(client: PoolClient, orderId: number): Promise<ManagedOrder | null>;

  /** Liczniki bieżącej pracy: do wysłania i czekające na płatność. */
  summarizeQueue(client: PoolClient): Promise<OrderQueueSummary>;

  /**
   * Opłacona sprzedaż dzień po dniu w ostatnich `days` dniach (z dzisiejszym), w strefie Europe/Warsaw.
   * Zwraca każdy dzień okresu, także bez sprzedaży.
   */
  salesByDay(client: PoolClient, days: SalesPeriod): Promise<SalesDay[]>;

  /** Status zamówienia z blokadą wiersza do końca transakcji, `null` gdy nie istnieje. */
  lockStatus(client: PoolClient, orderId: number): Promise<OrderStatus | null>;

  markPaid(client: PoolClient, orderId: number): Promise<void>;

  /** Anuluje zamówienie z powodem i zwraca płyty do sprzedaży. */
  cancel(client: PoolClient, orderId: number, reason: string): Promise<void>;
}
