import { UserNotFoundError } from "@/errors/user-not-found.error.js";
import type {
  CreateOrderData,
  ManagedOrder,
  ManagedOrderFilters,
  ManagedOrderScope,
  Order,
  OrderDetails,
  OrderStatus,
  OrderSummary,
  SalesPeriod,
} from "../types/order.types.js";
import { OrderStatusConflictError } from "@/errors/order-status-conflict.error.js";
import type { PoolClient } from "pg";
import type { OrderInterface } from "@/repositories/order/order.interface.js";
import type { Cache } from "@/cache/cache.interface.js";
import type { Database } from "@/database/database.interface.js";

/** Najwięcej zamówień w jednym eksporcie i wielkość strony, po której eksport je zbiera. */
export const EXPORT_LIMIT = 5000;
const EXPORT_PAGE = 100;

import { orderMail } from "./customer-mail.js";
import { createHash } from "node:crypto";
import type { Checkout } from "@/validators/order.validator.js";
import { AppError } from "@/errors/app.error.js";

const deliveryFees = {
  InPost: [400, 1600], DHL: [500, 2000], "Poczta Polska": [450, 1800],
} as const;

export class OrderService {
  constructor(
    private orderRepository: OrderInterface,
    private pool: Database,
    private productCache: Cache<unknown>,
  ) {}

  async checkout({ key, items, shipping, carrier, locale }: Checkout, userId: string | null = null): Promise<number> {
    const ordered = [...items].sort((a, b) => a.productVariantId - b.productVariantId);
    if (new Set(ordered.map(item => item.productVariantId)).size !== ordered.length)
      throw new AppError("Duplicate variants", 400);
    const hash = createHash("sha256").update(JSON.stringify(userId ? [ordered, shipping, carrier, userId] : [ordered, shipping, carrier])).digest("hex");
    const client = await this.pool.connect();
    const [eur, pln] = deliveryFees[carrier];
    let id: number;
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO orders(status, checkout_key, checkout_hash, shipping, carrier, delivery_eur, delivery_pln, user_id)
         VALUES ('pending', $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (checkout_key) DO NOTHING RETURNING id`, [key, hash, shipping, carrier, eur, pln, userId]);
      if (inserted.rowCount) {
        id = Number(inserted.rows[0].id);
        await this.orderRepository.createItems(client, id, ordered);
        const prices = await client.query(
          "SELECT product_variant_id, price_eur FROM order_items WHERE order_id = $1 ORDER BY product_variant_id", [id]);
        if (ordered.some((item, index) => item.priceEur !== Number(prices.rows[index].price_eur)))
          throw new AppError("Price changed", 409);
        await orderMail(client,id,shipping.email,locale,carrier,eur);
      } else {
        const existing = await client.query("SELECT id, checkout_hash FROM orders WHERE checkout_key = $1", [key]);
        if (existing.rows[0].checkout_hash !== hash) throw new AppError("Checkout key already used", 409);
        id = Number(existing.rows[0].id);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await this.productCache.clear();
    return id;
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const userExists = await this.orderRepository.findUserById(
        client,
        data.userId,
      );

      if (!userExists) {
        throw new UserNotFoundError(data.userId);
      }

      const order = await this.orderRepository.create(client, data);

      await this.orderRepository.createItems(client, order.id, data.items);

      await client.query("COMMIT");

      await this.productCache.clear();

      return order;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async getOrders(
    page: number,
    limit: number,
  ): Promise<{
    orders: OrderDetails[];
    total: number;
  }> {
    const client = await this.pool.connect();

    try {
      const orders = await this.orderRepository.findAll(client, page, limit);

      const total = await this.orderRepository.countAll(client);

      return {
        orders,
        total,
      };
    } finally {
      client.release();
    }
  }

  async getOrdersByUserId(userId: number): Promise<OrderDetails[]> {
    const client = await this.pool.connect();

    try {
      return await this.orderRepository.findByUserId(client, userId);
    } finally {
      client.release();
    }
  }

  async getOrderById(
    orderId: number,
    userId: number,
  ): Promise<OrderDetails | null> {
    const client = await this.pool.connect();

    try {
      return await this.orderRepository.findById(client, orderId, userId);
    } finally {
      client.release();
    }
  }

  async deleteOrder(
    orderId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const deleted = await this.orderRepository.delete(
        client,
        orderId,
        isAdmin ? undefined : userId,
      );

      await client.query("COMMIT");

      if (deleted) {
        await this.productCache.clear();
      }

      return deleted;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // ---- Obsługa zamówień w panelu (docs/sprzedaz.md) ----

  async getManagedOrders(
    filters: ManagedOrderFilters,
  ): Promise<{ orders: ManagedOrder[]; total: number }> {
    const client = await this.pool.connect();

    try {
      const orders = await this.orderRepository.findManaged(client, filters);
      const total = await this.orderRepository.countManaged(client, filters);

      return { orders, total };
    } finally {
      client.release();
    }
  }

  /**
   * Wszystkie zamówienia pasujące do filtrów, do eksportu. Zwraca `null`, gdy jest ich więcej niż
   * `EXPORT_LIMIT`: plik z tysiącami zamówień nie ma sensu, lepiej zawęzić zakres dat.
   */
  async exportManagedOrders(
    scope: ManagedOrderScope,
  ): Promise<ManagedOrder[] | null> {
    const client = await this.pool.connect();

    try {
      const total = await this.orderRepository.countManaged(client, scope);
      if (total > EXPORT_LIMIT) return null;

      const orders: ManagedOrder[] = [];
      for (let page = 1; orders.length < total; page += 1) {
        const batch = await this.orderRepository.findManaged(client, {
          ...scope,
          sort: "oldest",
          page,
          limit: EXPORT_PAGE,
        });
        if (batch.length === 0) break;
        orders.push(...batch);
      }

      return orders;
    } finally {
      client.release();
    }
  }

  async getManagedOrder(orderId: number): Promise<ManagedOrder | null> {
    const client = await this.pool.connect();

    try {
      return await this.orderRepository.findManagedById(client, orderId);
    } finally {
      client.release();
    }
  }

  /** Liczby pulpitu: bieżąca kolejka i opłacona sprzedaż w ostatnich `days` dniach. */
  async getOrderSummary(days: SalesPeriod): Promise<OrderSummary> {
    const client = await this.pool.connect();

    try {
      // Jeden obraz bazy, żeby kolejka i sprzedaż opisywały ten sam moment.
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

      try {
        const queue = await this.orderRepository.summarizeQueue(client);
        const daily = await this.orderRepository.salesByDay(client, days);
        await client.query("COMMIT");

        return {
          ...queue,
          sales: {
            days,
            totalEur: daily.reduce((sum, day) => sum + day.totalEur, 0),
            orders: daily.reduce((sum, day) => sum + day.orders, 0),
            units: daily.reduce((sum, day) => sum + day.units, 0),
            daily,
          },
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } finally {
      client.release();
    }
  }

  /** Ręczne potwierdzenie płatności (np. przelew), zanim płatności obsłuży Stripe. */
  async markOrderPaid(orderId: number): Promise<ManagedOrder | null> {
    return this.changeStatus(orderId, async (client, status) => {
      if (status !== "pending")
        throw new OrderStatusConflictError("mark as paid", status);
      await this.orderRepository.markPaid(client, orderId);
    });
  }

  /**
   * Anulowanie przed wysyłką: płyty wracają do sprzedaży, powód trafia do klienta.
   * Zwrot pieniędzy za opłacone zamówienie dojdzie razem ze Stripe.
   */
  async cancelOrder(
    orderId: number,
    reason: string,
  ): Promise<ManagedOrder | null> {
    return this.changeStatus(
      orderId,
      async (client, status) => {
        if (status !== "pending" && status !== "paid")
          throw new OrderStatusConflictError("cancel", status);
        await this.orderRepository.cancel(client, orderId, reason);
      },
      true,
    );
  }

  /** Zmiana statusu w transakcji z blokadą zamówienia; `null`, gdy zamówienia nie ma. */
  private async changeStatus(
    orderId: number,
    change: (client: PoolClient, status: OrderStatus) => Promise<void>,
    affectsStock = false,
  ): Promise<ManagedOrder | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const status = await this.orderRepository.lockStatus(client, orderId);

      if (!status) {
        await client.query("ROLLBACK");
        return null;
      }

      await change(client, status);
      const order = await this.orderRepository.findManagedById(client, orderId);

      await client.query("COMMIT");

      if (affectsStock) {
        await this.productCache.clear();
      }

      return order;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }
}
