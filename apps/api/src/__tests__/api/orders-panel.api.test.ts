import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
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
