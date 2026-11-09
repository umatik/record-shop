import type { OrderInterface } from "@/repositories/order/order.interface.js";
import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  ManagedOrder,
  ManagedOrderFilters,
  ManagedOrderItem,
  Order,
  OrderDetails,
  OrderItem,
  OrderQueueSummary,
  OrderRow,
  OrderStatus,
  SalesDay,
  SalesPeriod,
} from "../../types/order.types.js";
import { SOLD_STATUSES, type ManagedOrderSort } from "../../types/order.types.js";
import { ProductNotFoundError } from "@/errors/product-not-found.error.js";
import { InsufficientStockError } from "@/errors/insufficient-stock.error.js";

export class OrderPostgresRepository implements OrderInterface {
  async countAll(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE is_deleted = FALSE
      `,
    );

    return Number(result.rows[0].total);
  }

  private mapOrderRows(rows: OrderRow[]): OrderDetails[] {
    const orders = new Map<number, OrderDetails>();

    for (const row of rows) {
      const orderId = Number(row.orderId);

      let order = orders.get(orderId);

      if (!order) {
        const newOrder: OrderDetails = {
          id: orderId,
          userId: Number(row.userId),
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: [],
        };

        orders.set(orderId, newOrder);
        order = newOrder;
      }

      if (row.itemId !== null) {
        const item: OrderItem = {
          id: Number(row.itemId),
          productVariantId: Number(row.productVariantId),
          quantity: Number(row.quantity),
          priceEur: Number(row.priceEur),
          productId: Number(row.productId),
          productTitle: row.productTitle,
          variantAttributes: row.variantAttributes,
        };

        order.items.push(item);
      }
    }

    return Array.from(orders.values());
  }

  async findUserById(client: PoolClient, userId: number): Promise<boolean> {
    const result = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [userId],
    );

    return result.rows.length > 0;
  }

  async create(client: PoolClient, data: CreateOrderData): Promise<Order> {
    const result = await client.query(
      `
        INSERT INTO orders (user_id, status)
        VALUES ($1, 'pending')
        RETURNING
          id,
          user_id,
          status,
          created_at,
          updated_at
      `,
      [data.userId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Order was not created");
    }

    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createItems(
    client: PoolClient,
    orderId: number,
    items: CreateOrderItemData[],
  ): Promise<void> {
    const sortedItems = [...items].sort(
      (a, b) => a.productVariantId - b.productVariantId,
    );

    for (const item of sortedItems) {
      // Blokada współdzielona na produkcie: zamówienie czeka, aż skończy się publikacja, wycofanie albo
      // usuwanie tego produktu (te biorą FOR UPDATE), i odwrotnie. Bez niej usuwanie szkicu mogło skasować
      // pozycje zamówienia złożonego w międzyczasie.
      await client.query(
        `
          SELECT p.id
          FROM products p
                 JOIN product_variants pv ON pv.product_id = p.id
          WHERE pv.id = $1
          FOR SHARE OF p
        `,
        [item.productVariantId],
      );

      const stockResult = await client.query(
        `
          UPDATE product_variants pv
          SET quantity = pv.quantity - $1
          FROM products p
          WHERE pv.id = $2
            AND pv.product_id = p.id
            AND pv.is_deleted = FALSE
            AND p.is_deleted = FALSE
            AND p.is_published = TRUE
            AND pv.quantity >= $1
          RETURNING
            pv.id,
            pv.product_id,
            pv.price_eur,
            pv.quantity
        `,
        [item.quantity, item.productVariantId],
      );

      if (stockResult.rows.length === 0) {
        const productVariantResult = await client.query(
          `
          SELECT pv.id
          FROM product_variants pv
                 JOIN products p ON p.id = pv.product_id
          WHERE pv.id = $1
            AND pv.is_deleted = FALSE
            AND p.is_deleted = FALSE
            AND p.is_published = TRUE
        `,
          [item.productVariantId],
        );

        if (productVariantResult.rows.length === 0) {
          throw new ProductNotFoundError(item.productVariantId);
        }

        throw new InsufficientStockError(item.productVariantId);
      }

      const priceEur = Number(stockResult.rows[0].price_eur);

      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_variant_id,
            quantity,
            price_eur
          )
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.productVariantId, item.quantity, priceEur],
      );
    }
  }

  async findAll(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<OrderDetails[]> {
    const offset = (page - 1) * limit;

    const result = await client.query(
      `
        SELECT o.id                  AS "orderId",
               o.user_id             AS "userId",
               o.status,
               o.created_at          AS "createdAt",
               o.updated_at          AS "updatedAt",

               oi.id                 AS "itemId",
               oi.product_variant_id AS "productVariantId",
               oi.quantity,
               oi.price_eur          AS "priceEur",

               pv.product_id         AS "productId",
               p.title               AS "productTitle",
               pv.attributes         AS "variantAttributes"

        FROM (SELECT id,
                     user_id,
                     status,
                     created_at,
                     updated_at
              FROM orders
              WHERE is_deleted = FALSE
              ORDER BY id DESC
              LIMIT $1 OFFSET $2) o
               JOIN order_items oi
                    ON oi.order_id = o.id
               JOIN product_variants pv
                    ON pv.id = oi.product_variant_id
               JOIN products p
                    ON p.id = pv.product_id

        ORDER BY o.id DESC, oi.id
      `,
      [limit, offset],
    );

    return this.mapOrderRows(result.rows);
  }

  async findByUserId(
    client: PoolClient,
    userId: number,
  ): Promise<OrderDetails[]> {
    const result = await client.query(
      `
        SELECT o.id                  AS "orderId",
               o.user_id             AS "userId",
               o.status,
               o.created_at          AS "createdAt",
               o.updated_at          AS "updatedAt",

               oi.id                 AS "itemId",
               oi.product_variant_id AS "productVariantId",
               oi.quantity,
               oi.price_eur          AS "priceEur",

               pv.product_id         AS "productId",
               p.title               AS "productTitle",
               pv.attributes         AS "variantAttributes"

        FROM orders o
               JOIN order_items oi
                    ON oi.order_id = o.id
               JOIN product_variants pv
                    ON pv.id = oi.product_variant_id
               JOIN products p
                    ON p.id = pv.product_id

        WHERE o.user_id = $1
          AND o.is_deleted = FALSE

        ORDER BY o.id DESC, oi.id
      `,
      [userId],
    );

    return this.mapOrderRows(result.rows);
  }

  async findById(
    client: PoolClient,
    orderId: number,
    userId: number,
  ): Promise<OrderDetails | null> {
    const result = await client.query(
      `
        SELECT o.id                  AS "orderId",
               o.user_id             AS "userId",
               o.status,
               o.created_at          AS "createdAt",
               o.updated_at          AS "updatedAt",

               oi.id                 AS "itemId",
               oi.product_variant_id AS "productVariantId",
               oi.quantity,
               oi.price_eur          AS "priceEur",

               pv.product_id         AS "productId",
               p.title               AS "productTitle",
               pv.attributes         AS "variantAttributes"

        FROM orders o
               JOIN order_items oi
                    ON oi.order_id = o.id
               JOIN product_variants pv
                    ON pv.id = oi.product_variant_id
               JOIN products p
                    ON p.id = pv.product_id

        WHERE o.id = $1
          AND o.user_id = $2
          AND o.is_deleted = FALSE

        ORDER BY oi.id
      `,
      [orderId, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapOrderRows(result.rows)[0] ?? null;
  }

  async delete(
    client: PoolClient,
    orderId: number,
    userId?: number,
  ): Promise<boolean> {
    const orderResult = await client.query(
      `
        SELECT id, status
        FROM orders
        WHERE id = $1
          AND ($2::BIGINT IS NULL OR user_id = $2)
          AND is_deleted = FALSE
          FOR UPDATE
      `,
      [orderId, userId ?? null],
    );

    const order = orderResult.rows[0];

    if (!order) {
      return false;
    }

    const shouldRestoreStock =
      order.status === "pending" || order.status === "paid";

    if (shouldRestoreStock) {
      await this.restoreStock(client, orderId);
    }

    const result = await client.query(
      `
        UPDATE orders
        SET status = CASE
                       WHEN status IN ('pending', 'paid')
                         THEN 'cancelled'
                       ELSE status
                     END,
            is_deleted = TRUE,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [orderId],
    );

    return result.rowCount === 1;
  }
  /** Zwraca płyty z pozycji zamówienia do sprzedaży (anulowanie albo usunięcie przed wysyłką). */
  private async restoreStock(client: PoolClient, orderId: number): Promise<void> {
    await client.query(
      `
        UPDATE product_variants pv
        SET quantity = pv.quantity + stock.quantity
        FROM (SELECT product_variant_id,
                     SUM(quantity) AS quantity
              FROM order_items
              WHERE order_id = $1
              GROUP BY product_variant_id) stock
        WHERE pv.id = stock.product_variant_id
      `,
      [orderId],
    );
  }

  // ---- Obsługa zamówień w panelu ----

  async countManaged(client: PoolClient, status?: OrderStatus): Promise<number> {
    const result = await client.query(
      `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE is_deleted = FALSE
          AND ($1::TEXT IS NULL OR status = $1)
      `,
      [status ?? null],
    );

    return Number(result.rows[0].total);
  }

  async findManaged(client: PoolClient, filters: ManagedOrderFilters): Promise<ManagedOrder[]> {
    const orderBy = MANAGED_ORDER_BY[filters.sort];
    const offset = (filters.page - 1) * filters.limit;

    const result = await client.query(
      `
        WITH page AS (SELECT id
                      FROM orders
                      WHERE is_deleted = FALSE
                        AND ($1::TEXT IS NULL OR status = $1)
                      ORDER BY ${orderBy("")}
                      LIMIT $2 OFFSET $3)
        ${MANAGED_ORDER_SELECT}
        WHERE o.id IN (SELECT id FROM page)
        ORDER BY ${orderBy("o.")}, oi.id
      `,
      [filters.status ?? null, filters.limit, offset],
    );

    return this.mapManagedRows(result.rows);
  }

  async findManagedById(client: PoolClient, orderId: number): Promise<ManagedOrder | null> {
    const result = await client.query(
      `
        ${MANAGED_ORDER_SELECT}
        WHERE o.id = $1
          AND o.is_deleted = FALSE
        ORDER BY oi.id
      `,
      [orderId],
    );

    return this.mapManagedRows(result.rows)[0] ?? null;
  }

  async summarizeQueue(client: PoolClient): Promise<OrderQueueSummary> {
    // Wartość liczona w podzapytaniu na zamówienie: złączenie z pozycjami powieliłoby zamówienia w licznikach.
    const result = await client.query(
      `
        SELECT COUNT(*) FILTER (WHERE o.status = 'paid')                           AS "toShip",
               MIN(o.paid_at) FILTER (WHERE o.status = 'paid')                     AS "oldestPaidAt",
               COUNT(*) FILTER (WHERE o.status = 'pending')                        AS "pending",
               COALESCE(SUM(items.total) FILTER (WHERE o.status = 'pending'), 0)   AS "pendingTotal",
               MIN(o.created_at) FILTER (WHERE o.status = 'pending')               AS "oldestCreatedAt",
               COUNT(*) FILTER (WHERE o.status IN (${SOLD_STATUS_LIST})
                                  AND o.paid_at IS NULL)                           AS "soldWithoutPaidAt"
        FROM orders o
               LEFT JOIN LATERAL (SELECT SUM(oi.price_eur * oi.quantity) AS total
                                  FROM order_items oi
                                  WHERE oi.order_id = o.id) items ON TRUE
        WHERE o.is_deleted = FALSE
      `,
    );

    const row = result.rows[0];

    return {
      toShip: { count: Number(row.toShip), oldestPaidAt: row.oldestPaidAt },
      pending: {
        count: Number(row.pending),
        totalEur: Number(row.pendingTotal),
        oldestCreatedAt: row.oldestCreatedAt,
      },
      soldWithoutPaidAt: Number(row.soldWithoutPaidAt),
    };
  }

  async salesByDay(client: PoolClient, days: SalesPeriod): Promise<SalesDay[]> {
    // Dni liczone w czasie lokalnym sklepu (`AT TIME ZONE` zna zmianę czasu, sztywne przesunięcie UTC nie).
    // Okres: od początku dnia sprzed `days - 1` dni do teraz. Datą sprzedaży jest `paid_at`.
    const result = await client.query(
      `
        WITH bounds AS (SELECT date_trunc('day', NOW() AT TIME ZONE '${SHOP_TIME_ZONE}') AS today),
             period AS (SELECT generate_series(today - make_interval(days => $1::INT - 1), today, INTERVAL '1 day') AS day
                        FROM bounds),
             sold AS (SELECT o.id,
                             date_trunc('day', o.paid_at AT TIME ZONE '${SHOP_TIME_ZONE}') AS day,
                             items.total,
                             items.units
                      FROM orders o
                             JOIN LATERAL (SELECT COALESCE(SUM(oi.price_eur * oi.quantity), 0) AS total,
                                                  COALESCE(SUM(oi.quantity), 0)                AS units
                                           FROM order_items oi
                                           WHERE oi.order_id = o.id) items ON TRUE
                      WHERE o.is_deleted = FALSE
                        AND o.status IN (${SOLD_STATUS_LIST})
                        AND o.paid_at >= (SELECT MIN(day) FROM period) AT TIME ZONE '${SHOP_TIME_ZONE}'
                        AND o.paid_at <= NOW())
        SELECT to_char(period.day, 'YYYY-MM-DD') AS "date",
               COALESCE(SUM(sold.total), 0)      AS "totalEur",
               COUNT(sold.id)                    AS "orders",
               COALESCE(SUM(sold.units), 0)      AS "units"
        FROM period
               LEFT JOIN sold ON sold.day = period.day
        GROUP BY period.day
        ORDER BY period.day
      `,
      [days],
    );

    return result.rows.map((row) => ({
      date: row.date,
      totalEur: Number(row.totalEur),
      orders: Number(row.orders),
      units: Number(row.units),
    }));
  }

  async lockStatus(client: PoolClient, orderId: number): Promise<OrderStatus | null> {
    const result = await client.query(
      `
        SELECT status
        FROM orders
        WHERE id = $1
          AND is_deleted = FALSE
          FOR UPDATE
      `,
      [orderId],
    );

    return result.rows[0]?.status ?? null;
  }

  async markPaid(client: PoolClient, orderId: number): Promise<void> {
    await client.query(
      `
        UPDATE orders
        SET status     = 'paid',
            paid_at    = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [orderId],
    );
  }

  async cancel(client: PoolClient, orderId: number, reason: string): Promise<void> {
    await this.restoreStock(client, orderId);
    await client.query(
      `
        UPDATE orders
        SET status        = 'cancelled',
            cancelled_at  = NOW(),
            cancel_reason = $2,
            updated_at    = NOW()
        WHERE id = $1
      `,
      [orderId, reason],
    );
  }

  private mapManagedRows(rows: ManagedOrderRow[]): ManagedOrder[] {
    const orders = new Map<number, ManagedOrder>();

    for (const row of rows) {
      const id = Number(row.orderId);
      let order = orders.get(id);

      if (!order) {
        order = {
          id,
          status: row.status,
          totalEur: 0,
          buyer: {
            id: Number(row.buyerId),
            email: row.buyerEmail,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            address: row.address,
            city: row.city,
            postalCode: row.postalCode,
            country: row.country,
          },
          items: [],
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          paidAt: row.paidAt,
          shippedAt: row.shippedAt,
          cancelledAt: row.cancelledAt,
          cancelReason: row.cancelReason,
        };
        orders.set(id, order);
      }

      const item: ManagedOrderItem = {
        id: Number(row.itemId),
        productVariantId: Number(row.productVariantId),
        quantity: Number(row.quantity),
        priceEur: Number(row.priceEur),
        productId: Number(row.productId),
        productTitle: row.productTitle,
        variantAttributes: row.variantAttributes,
        artists: Array.isArray(row.artists) ? row.artists : [],
        photoUrl: row.photoUrl,
      };
      order.items.push(item);
      order.totalEur += item.priceEur * item.quantity;
    }

    return Array.from(orders.values());
  }
}

type ManagedOrderRow = {
  orderId: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  buyerId: number;
  buyerEmail: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  itemId: number;
  productVariantId: number;
  quantity: number;
  priceEur: number;
  productId: number;
  productTitle: string;
  variantAttributes: Record<string, unknown>;
  artists: string[] | null;
  photoUrl: string | null;
};

/** Strefa czasowa sklepu: w niej liczą się dni sprzedaży. */
const SHOP_TIME_ZONE = "Europe/Warsaw";

const SOLD_STATUS_LIST = SOLD_STATUSES.map((status) => `'${status}'`).join(", ");

/** ORDER BY listy panelu; `prefix` to alias tabeli zamówień z kropką. Remisy rozstrzyga ID. */
const MANAGED_ORDER_BY: Record<ManagedOrderSort, (prefix: string) => string> = {
  newest: (prefix) => `${prefix}created_at DESC, ${prefix}id DESC`,
  oldest: (prefix) => `${prefix}created_at ASC, ${prefix}id ASC`,
  paid_oldest: (prefix) => `${prefix}paid_at ASC NULLS LAST, ${prefix}id ASC`,
};

/** Zamówienie z kupującym, pozycjami i zdjęciem głównym wariantu; filtr i kolejność dokleja wywołujący. */
const MANAGED_ORDER_SELECT = `
  SELECT o.id                  AS "orderId",
         o.status,
         o.created_at          AS "createdAt",
         o.updated_at          AS "updatedAt",
         o.paid_at             AS "paidAt",
         o.shipped_at          AS "shippedAt",
         o.cancelled_at        AS "cancelledAt",
         o.cancel_reason       AS "cancelReason",
         u.id                  AS "buyerId",
         u.email               AS "buyerEmail",
         c.first_name          AS "firstName",
         c.last_name           AS "lastName",
         c.phone,
         c.address,
         c.city,
         c.postal_code         AS "postalCode",
         c.country,
         oi.id                 AS "itemId",
         oi.product_variant_id AS "productVariantId",
         oi.quantity,
         oi.price_eur          AS "priceEur",
         p.id                  AS "productId",
         p.title               AS "productTitle",
         pv.attributes         AS "variantAttributes",
         p.attributes -> 'artists' AS artists,
         photo.url             AS "photoUrl"
  FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN user_contact_details c ON c.user_id = u.id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN product_variants pv ON pv.id = oi.product_variant_id
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN LATERAL (SELECT m.url
                            FROM product_variant_media m
                            WHERE m.product_variant_id = pv.id
                              AND m.type = 'photo'
                            ORDER BY m.is_primary DESC, m.sort_order, m.id
                            LIMIT 1) photo ON TRUE
`;

