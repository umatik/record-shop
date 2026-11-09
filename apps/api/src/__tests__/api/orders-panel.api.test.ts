import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { pool } from "@/database/db.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

// Obsługa zamówień w panelu admina (docs/sprzedaz.md): lista do wysłania, szczegóły, płatność, anulowanie.

let adminToken: string;
let userToken: string;
let variantId: number;

const stockOf = async (id: number): Promise<number> => {
  const response = await request(app)
    .get(`/products/manage?status=all&limit=100`)
    .set("Authorization", `Bearer ${adminToken}`);
  const variant = response.body.products
    .flatMap((product: { variants: { id: number; quantity: number }[] }) => product.variants)
    .find((v: { id: number }) => v.id === id);
  return variant.quantity;
};

const placeOrder = async (quantity = 1): Promise<number> => {
  const response = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ items: [{ productVariantId: variantId, quantity }] });
  expect(response.status).toBe(201);
  return response.body.order.id;
};

beforeEach(async () => {
  adminToken = await loginAsAdmin();
  userToken = await loginAsUser();

  const product = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      type: "vinyl",
      title: "Youths Of Today",
      attributes: { artists: ["Patrick Andy"] },
      variants: [
        { priceEur: 1500, quantity: 3, attributes: { format: '7"', mediaCondition: "VG+", sleeveCondition: "generic" } },
      ],
    });
  expect(product.status).toBe(201);
  variantId = product.body.product.variants[0].id;

  const published = await request(app)
    .post(`/products/${product.body.product.id}/publish`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(published.status).toBe(200);
});

afterAll(async () => {
  await redisClient.close();
});

describe("Orders in the admin panel", () => {
  it("should be available only with orders:manage", async () => {
    const anonymous = await request(app).get("/orders/manage");
    const user = await request(app).get("/orders/manage").set("Authorization", `Bearer ${userToken}`);

    expect(anonymous.status).toBe(401);
    expect(user.status).toBe(403);
  });

  it("should list paid orders oldest first with the buyer, items and total", async () => {
    const first = await placeOrder(1);
    const second = await placeOrder(1);
    // Ostatnia sztuka zostaje w zamówieniu czekającym na płatność: nie może trafić na listę „do wysłania”.
    await placeOrder(1);

    for (const id of [second, first]) {
      const paid = await request(app).post(`/orders/${id}/mark-paid`).set("Authorization", `Bearer ${adminToken}`);
      expect(paid.status).toBe(200);
    }

    const response = await request(app)
      .get("/orders/manage?status=paid&sort=oldest")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.orders.map((order: { id: number }) => order.id)).toEqual([first, second]);
    expect(response.body.pagination.total).toBe(2);

    const [order] = response.body.orders;
    expect(order).toMatchObject({
      status: "paid",
      totalEur: 1500,
      buyer: { email: "alice@example.com" },
      paidAt: expect.any(String),
    });
    expect(order.items[0]).toMatchObject({ productTitle: "Youths Of Today", artists: ["Patrick Andy"], quantity: 1 });
  });

  it("should show one order with the buyer's contact details", async () => {
    const id = await placeOrder();

    const response = await request(app).get(`/orders/manage/${id}`).set("Authorization", `Bearer ${adminToken}`);
    const missing = await request(app).get("/orders/manage/999999").set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.order).toMatchObject({ id, status: "pending", buyer: { email: "alice@example.com" } });
    expect(response.body.order.buyer).toHaveProperty("address");
    expect(missing.status).toBe(404);
  });

  it("should cancel a paid order with a reason and put the records back on sale", async () => {
    const id = await placeOrder(2);
    await request(app).post(`/orders/${id}/mark-paid`).set("Authorization", `Bearer ${adminToken}`);
    expect(await stockOf(variantId)).toBe(1);

    const response = await request(app)
      .post(`/orders/${id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Płyta pękła przy pakowaniu" });

    expect(response.status).toBe(200);
    expect(response.body.order).toMatchObject({
      status: "cancelled",
      cancelReason: "Płyta pękła przy pakowaniu",
      cancelledAt: expect.any(String),
    });
    expect(await stockOf(variantId)).toBe(3);
  });

  it("should not cancel twice or without a reason, nor mark a paid order as paid again", async () => {
    const id = await placeOrder();

    const noReason = await request(app)
      .post(`/orders/${id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "  " });
    await request(app).post(`/orders/${id}/mark-paid`).set("Authorization", `Bearer ${adminToken}`);
    const paidAgain = await request(app).post(`/orders/${id}/mark-paid`).set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/orders/${id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Klient zrezygnował" });
    const cancelledAgain = await request(app)
      .post(`/orders/${id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Jeszcze raz" });

    expect(noReason.status).toBe(400);
    expect(paidAgain.status).toBe(409);
    expect(cancelledAgain.status).toBe(409);
    expect(await stockOf(variantId)).toBe(3);
  });

  it("should reject an unknown status filter", async () => {
    const response = await request(app)
      .get("/orders/manage?status=lost")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });
});

describe("Order history filters", () => {
  const list = async (query: string) => {
    const response = await request(app).get(`/orders/manage?${query}`).set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    return {
      ids: response.body.orders.map((order: { id: number }) => order.id) as number[],
      total: response.body.pagination.total as number,
    };
  };

  /** Dzień `daysAgo` dni temu w czasie sklepu, jako `YYYY-MM-DD`. */
  const shopDay = async (daysAgo: number): Promise<string> => {
    const result = await pool.query(
      "SELECT to_char((NOW() AT TIME ZONE 'Europe/Warsaw')::DATE - $1::INT, 'YYYY-MM-DD') AS day",
      [daysAgo],
    );
    return result.rows[0].day;
  };

  it("should filter by the order day in Europe/Warsaw, both ends included", async () => {
    const old = await placeOrder();
    const edge = await placeOrder();
    const recent = await placeOrder();
    const start = "date_trunc('day', NOW() AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'Europe/Warsaw'";
    // Sekunda przed północą sprzed 5 dni, dokładnie ta północ i dziś.
    await pool.query(`UPDATE orders SET created_at = ${start} - INTERVAL '5 days 1 second' WHERE id = $1`, [old]);
    await pool.query(`UPDATE orders SET created_at = ${start} - INTERVAL '5 days' WHERE id = $1`, [edge]);

    const fiveDaysAgo = await shopDay(5);
    const today = await shopDay(0);

    const since = await list(`from=${fiveDaysAgo}&sort=oldest`);
    const until = await list(`to=${fiveDaysAgo}&sort=oldest`);
    const oneDay = await list(`from=${fiveDaysAgo}&to=${fiveDaysAgo}`);
    const before = await list(`to=${await shopDay(6)}`);

    expect(since).toEqual({ ids: [edge, recent], total: 2 });
    expect(until).toEqual({ ids: [old, edge], total: 2 });
    expect(oneDay).toEqual({ ids: [edge], total: 1 });
    expect(before).toEqual({ ids: [old], total: 1 });
    expect((await list(`from=${today}`)).ids).toEqual([recent]);
  });

  it("should find orders by the buyer or the order number and combine with the status", async () => {
    const paid = await placeOrder();
    const pending = await placeOrder();
    await request(app).post(`/orders/${paid}/mark-paid`).set("Authorization", `Bearer ${adminToken}`);

    expect((await list("q=alice@example")).total).toBe(2);
    expect((await list("q=ALICE")).total).toBe(2);
    expect((await list("q=nobody")).total).toBe(0);
    // `%` i `_` to zwykłe znaki, nie wzorce.
    expect((await list("q=%25")).total).toBe(0);
    expect(await list(`q=${pending}`)).toEqual({ ids: [pending], total: 1 });
    expect(await list(`q=%23${paid}`)).toEqual({ ids: [paid], total: 1 });
    expect(await list("q=alice&status=paid")).toEqual({ ids: [paid], total: 1 });
  });

  it("should reject an invalid date", async () => {
    const response = await request(app)
      .get("/orders/manage?from=09-11-2026")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });
});

describe("Order history export", () => {
  const download = (query: string) =>
    request(app)
      .get(`/orders/manage/export?${query}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

  it("should be available only with orders:manage", async () => {
    const user = await request(app)
      .get("/orders/manage/export?format=csv")
      .set("Authorization", `Bearer ${userToken}`);

    expect(user.status).toBe(403);
  });

  it("should export a CSV with one row per item, respecting the status filter", async () => {
    const paid = await placeOrder(1);
    await request(app).post(`/orders/${paid}/mark-paid`).set("Authorization", `Bearer ${adminToken}`);
    await placeOrder(1);

    const response = await download("format=csv&status=paid");
    const text = response.body.toString("utf8");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toMatch(/^attachment; filename="zamowienia-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(text.startsWith("﻿Numer zamówienia;")).toBe(true);
    const lines = text.trim().split(/\r\n/);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`${paid};`);
    expect(lines[1]).toContain("Opłacone");
    expect(lines[1]).toContain(";15,00;15,00");
  });

  it("should export a PDF", async () => {
    await placeOrder(1);

    const response = await download("format=pdf");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("should reject an unknown format", async () => {
    const response = await request(app)
      .get("/orders/manage/export?format=xlsx")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });

  it("should not send the export by e-mail without ORDERS_EXPORT_EMAIL", async () => {
    const previous = process.env.ORDERS_EXPORT_EMAIL;
    delete process.env.ORDERS_EXPORT_EMAIL;

    const response = await request(app)
      .post("/orders/manage/export/email?format=pdf")
      .set("Authorization", `Bearer ${adminToken}`);

    if (previous !== undefined) process.env.ORDERS_EXPORT_EMAIL = previous;
    expect(response.status).toBe(409);
  });
});
