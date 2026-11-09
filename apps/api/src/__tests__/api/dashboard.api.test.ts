import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { pool } from "@/database/db.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

// Liczby pulpitu (docs/pulpit-claude.md): sprzedaż, kolejka wysyłek, gotowe szkice i stan magazynu.

/** Początek dzisiejszego dnia w strefie sklepu, jako wyrażenie SQL. */
const TODAY = "date_trunc('day', NOW() AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'Europe/Warsaw'";

type Day = { date: string; totalEur: number; orders: number; units: number };

let adminToken: string;
let userToken: string;
let cheapVariant: number;
let dearVariant: number;
let cheapProduct: number;

const admin = (path: string) => request(app).get(path).set("Authorization", `Bearer ${adminToken}`);

const createRecord = async (title: string, priceEur: number, quantity = 10) => {
  const product = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      type: "vinyl",
      title,
      attributes: { artists: ["Dashboard Artist"] },
      variants: [{ priceEur, quantity, attributes: { format: '7"', mediaCondition: "VG+", sleeveCondition: "generic" } }],
    });
  expect(product.status).toBe(201);

  const published = await request(app)
    .post(`/products/${product.body.product.id}/publish`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(published.status).toBe(200);

  return { productId: product.body.product.id as number, variantId: product.body.product.variants[0].id as number };
};

const placeOrder = async (items: { productVariantId: number; quantity: number }[]): Promise<number> => {
  const response = await request(app).post("/orders").set("Authorization", `Bearer ${userToken}`).send({ items });
  expect(response.status).toBe(201);
  return response.body.order.id;
};

const markPaid = async (orderId: number) => {
  const response = await request(app)
    .post(`/orders/${orderId}/mark-paid`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(response.status).toBe(200);
};

const paidOrder = async (items: { productVariantId: number; quantity: number }[]) => {
  const orderId = await placeOrder(items);
  await markPaid(orderId);
  return orderId;
};

/** Ustawia czas opłacenia wyrażeniem SQL, np. siedem dni przed początkiem dzisiejszego dnia. */
const setPaidAt = (orderId: number, sql: string) =>
  pool.query(`UPDATE orders SET paid_at = ${sql} WHERE id = $1`, [orderId]);

const summary = async (days?: number) => {
  const response = await admin(`/orders/manage/summary${days ? `?days=${days}` : ""}`);
  expect(response.status).toBe(200);
  return response.body;
};

beforeEach(async () => {
  adminToken = await loginAsAdmin();
  userToken = await loginAsUser();

  const cheap = await createRecord("Cheap Tune", 1500);
  const dear = await createRecord("Dear Tune", 2000);
  cheapVariant = cheap.variantId;
  cheapProduct = cheap.productId;
  dearVariant = dear.variantId;
});

afterAll(async () => {
  await redisClient.close();
});

describe("Dashboard order summary", () => {
  it("should be available only with orders:manage", async () => {
    const anonymous = await request(app).get("/orders/manage/summary");
    const user = await request(app).get("/orders/manage/summary").set("Authorization", `Bearer ${userToken}`);

    expect(anonymous.status).toBe(401);
    expect(user.status).toBe(403);
  });

  it("should accept only the 7 and 30 day periods", async () => {
    const invalid = await admin("/orders/manage/summary?days=14");
    const week = await summary(7);
    const month = await summary();

    expect(invalid.status).toBe(400);
    expect(week.sales.days).toBe(7);
    expect(week.sales.daily).toHaveLength(7);
    expect(month.sales.days).toBe(30);
    expect(month.sales.daily).toHaveLength(30);
  });

  it("should report real zeros when nothing was sold", async () => {
    const body = await summary(7);

    expect(body.toShip).toEqual({ count: 0, oldestPaidAt: null });
    expect(body.pending).toEqual({ count: 0, totalEur: 0, oldestCreatedAt: null });
    expect(body.sales).toMatchObject({ totalEur: 0, orders: 0, units: 0 });
    expect(body.sales.daily.every((day: Day) => day.totalEur === 0 && day.orders === 0 && day.units === 0)).toBe(true);
  });

  it("should count paid, shipped and delivered orders but not pending or cancelled ones", async () => {
    await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    const shipped = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    const delivered = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    const cancelled = await paidOrder([{ productVariantId: dearVariant, quantity: 1 }]);
    await placeOrder([{ productVariantId: dearVariant, quantity: 3 }]);

    await pool.query("UPDATE orders SET status = 'shipped', shipped_at = NOW() WHERE id = $1", [shipped]);
    await pool.query("UPDATE orders SET status = 'delivered' WHERE id = $1", [delivered]);
    const cancel = await request(app)
      .post(`/orders/${cancelled}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Out of stock" });
    expect(cancel.status).toBe(200);

    const body = await summary();

    expect(body.sales).toMatchObject({ totalEur: 4500, orders: 3, units: 3 });
    // Wysłane i doręczone nie czekają już na wysyłkę; czekające na płatność liczą się osobno.
    expect(body.toShip.count).toBe(1);
    expect(body.pending).toMatchObject({ count: 1, totalEur: 6000 });
    expect(body.pending.oldestCreatedAt).toEqual(expect.any(String));
  });

  it("should sum order items once per order, with quantities", async () => {
    await paidOrder([
      { productVariantId: cheapVariant, quantity: 2 },
      { productVariantId: dearVariant, quantity: 3 },
    ]);
    await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);

    const body = await summary();
    const today = body.sales.daily.at(-1);

    // 2 × 15 € + 3 × 20 € + 15 €: dwa zamówienia, sześć sztuk.
    expect(body.sales).toMatchObject({ totalEur: 10_500, orders: 2, units: 6 });
    expect(today).toMatchObject({ totalEur: 10_500, orders: 2, units: 6 });
    expect(body.sales.daily.reduce((sum: number, day: Day) => sum + day.totalEur, 0)).toBe(body.sales.totalEur);
    expect(body.toShip.count).toBe(2);
  });

  it("should keep the price from the day of purchase when the variant price changes", async () => {
    await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);

    const repriced = await request(app)
      .patch(`/products/${cheapProduct}/variants/${cheapVariant}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ priceEur: 9900 });
    expect(repriced.status).toBe(200);

    const body = await summary();

    expect(body.sales.totalEur).toBe(1500);
  });

  it("should start the period at the beginning of the first day in Europe/Warsaw", async () => {
    const onTheEdge = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    const justBefore = await paidOrder([{ productVariantId: dearVariant, quantity: 1 }]);

    // Okres 7 dni zaczyna się o północy sześć dni temu: ta chwila należy do okresu, sekunda wcześniej już nie.
    await setPaidAt(onTheEdge, `${TODAY} - INTERVAL '6 days'`);
    await setPaidAt(justBefore, `${TODAY} - INTERVAL '6 days' - INTERVAL '1 second'`);

    const week = await summary(7);
    const month = await summary(30);

    expect(week.sales).toMatchObject({ totalEur: 1500, orders: 1, units: 1 });
    expect(week.sales.daily[0]).toMatchObject({ totalEur: 1500, orders: 1 });
    expect(month.sales).toMatchObject({ totalEur: 3500, orders: 2, units: 2 });
    // W okresie 30 dni oba zamówienia trafiają do sąsiednich dni, każde do swojego.
    expect(month.sales.daily.filter((day: Day) => day.orders === 1)).toHaveLength(2);
  });

  it("should date a sale by payment, not by the order date", async () => {
    const orderId = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    await pool.query("UPDATE orders SET created_at = NOW() - INTERVAL '60 days' WHERE id = $1", [orderId]);

    const stale = await paidOrder([{ productVariantId: dearVariant, quantity: 1 }]);
    await setPaidAt(stale, "NOW() - INTERVAL '60 days'");

    const body = await summary(30);

    expect(body.sales).toMatchObject({ totalEur: 1500, orders: 1 });
  });

  it("should report sold orders without a payment time instead of dating them by creation", async () => {
    const orderId = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    await setPaidAt(orderId, "NULL");

    const body = await summary();

    expect(body.soldWithoutPaidAt).toBe(1);
    expect(body.sales).toMatchObject({ totalEur: 0, orders: 0 });
  });

  it("should give the payment time of the longest waiting order", async () => {
    const first = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    await setPaidAt(first, "NOW() - INTERVAL '3 days'");

    const body = await summary();
    const waitedMs = Date.now() - new Date(body.toShip.oldestPaidAt).getTime();

    expect(body.toShip.count).toBe(2);
    expect(Math.floor(waitedMs / 86_400_000)).toBe(3);
  });
});

describe("Shipping queue order", () => {
  it("should sort by payment time, whatever the order date", async () => {
    const orderedFirst = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    const orderedSecond = await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]);
    await setPaidAt(orderedFirst, "NOW() - INTERVAL '1 day'");
    await setPaidAt(orderedSecond, "NOW() - INTERVAL '2 days'");

    const queue = await admin("/orders/manage?status=paid&sort=paid_oldest");
    const byOrderDate = await admin("/orders/manage?status=paid&sort=oldest");
    const ids = (body: { orders: { id: number }[] }) => body.orders.map((order) => order.id);

    expect(ids(queue.body)).toEqual([orderedSecond, orderedFirst]);
    // `oldest` dalej znaczy „najwcześniej złożone”.
    expect(ids(byOrderDate.body)).toEqual([orderedFirst, orderedSecond]);
  });

  it("should break ties by id and keep the order across pages", async () => {
    const ids: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      ids.push(await paidOrder([{ productVariantId: cheapVariant, quantity: 1 }]));
    }
    await pool.query("UPDATE orders SET paid_at = NOW() - INTERVAL '1 day' WHERE id = ANY ($1::BIGINT[])", [ids]);

    const firstPage = await admin("/orders/manage?status=paid&sort=paid_oldest&limit=2&page=1");
    const secondPage = await admin("/orders/manage?status=paid&sort=paid_oldest&limit=2&page=2");
    const listed = [...firstPage.body.orders, ...secondPage.body.orders].map((order: { id: number }) => order.id);

    expect(listed).toEqual(ids);
    expect(firstPage.body.pagination.total).toBe(3);
  });
});

describe("Drafts ready to publish", () => {
  const readyDrafts = async () => {
    const response = await admin("/products/manage?status=draft&ready=true&limit=100");
    expect(response.status).toBe(200);
    return response.body;
  };

  const createDraft = async (attributes: Record<string, unknown>) => {
    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "vinyl",
        title: "Draft Tune",
        attributes: { artists: ["Draft Artist"], ...attributes },
        variants: [
          { priceEur: 1200, quantity: 1, attributes: { format: '7"', mediaCondition: "VG", sleeveCondition: "generic" } },
        ],
      });
    expect(response.status).toBe(201);
    return response.body.product.id as number;
  };

  it("should need a variant, a photo and a preview link", async () => {
    const before = (await readyDrafts()).pagination.total;

    const complete = await createDraft({ previewLinks: ["https://www.youtube.com/watch?v=abc"] });
    const noPreview = await createDraft({});
    const noPhoto = await createDraft({ previewLinks: ["https://www.youtube.com/watch?v=def"] });
    await pool.query("UPDATE products SET primary_photo_url = 'products/photo/test.jpg' WHERE id = ANY ($1::BIGINT[])", [
      [complete, noPreview],
    ]);

    const ready = await readyDrafts();
    const ids = ready.products.map((product: { id: number }) => product.id);

    expect(ready.pagination.total).toBe(before + 1);
    expect(ids).toContain(complete);
    expect(ids).not.toContain(noPreview);
    expect(ids).not.toContain(noPhoto);
  });

  it("should need products:update", async () => {
    const response = await request(app)
      .get("/products/manage?status=draft&ready=true")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});

describe("Stock in the available catalogue", () => {
  const stock = async (query: string) => {
    const response = await admin(`/products/manage?status=published&limit=1${query}`);
    expect(response.status).toBe(200);
    return response.body as { copies: number; presses: number; pagination: { total: number } };
  };

  it("should count only presses in stock when the list is filtered by availability", async () => {
    const all = await stock("");
    const available = await stock("&available=true");

    // Tjun z jednym presem na stanie i jednym wyprzedanym oraz tjun wyprzedany w całości.
    const mixed = await createRecord("Mixed Stock", 1000, 4);
    const soldOutPress = await request(app)
      .post(`/products/${mixed.productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ priceEur: 1100, quantity: 0, attributes: { format: "LP", mediaCondition: "VG", sleeveCondition: "VG" } });
    expect(soldOutPress.status).toBe(201);
    await createRecord("Sold Out", 1000, 0);

    const allAfter = await stock("");
    const availableAfter = await stock("&available=true");

    expect(allAfter.presses - all.presses).toBe(3);
    expect(allAfter.pagination.total - all.pagination.total).toBe(2);
    expect(availableAfter.presses - available.presses).toBe(1);
    expect(availableAfter.copies - available.copies).toBe(4);
    expect(availableAfter.pagination.total - available.pagination.total).toBe(1);
    // Sztuk jest tyle samo w obu ujęciach: wyprzedane presy nic nie dokładają.
    expect(availableAfter.copies).toBe(allAfter.copies);
  });
});
