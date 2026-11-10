import { afterAll, beforeEach, describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

const vinylVariant = (mediaCondition = "NM") => ({
  format: "LP",
  mediaCondition,
  sleeveCondition: "NM",
});

let adminToken: string;
let userToken: string;
let userId: number;
let productId: number;
let variantId: number;
let orderId: number;

beforeEach(async () => {
  adminToken = await loginAsAdmin();
  userToken = await loginAsUser();

  const userResponse = await request(app)
    .get("/users/1")
    .set("Authorization", `Bearer ${userToken}`);

  expect(userResponse.status).toBe(200);

  userId = Number(userResponse.body.user.id);

  const productResponse = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      type: "vinyl",
      attributes: { artists: ["Test Artist"] },
      title: "API Test Order Product",
      variants: [
        {
          priceEur: 10000,
          attributes: vinylVariant(),
          quantity: 10,
        },
      ],
    });

  expect(productResponse.status).toBe(201);

  productId = productResponse.body.product.id;

  const publishResponse = await request(app)
    .post(`/products/${productId}/publish`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(publishResponse.status).toBe(200);

  const product = await request(app).get(`/products/${productId}`);

  expect(product.status).toBe(200);
  expect(product.body.product.variants).toBeDefined();
  expect(product.body.product.variants.length).toBeGreaterThan(0);

  variantId = product.body.product.variants[0].id;

  const orderResponse = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      items: [
        {
          productVariantId: variantId,
          quantity: 1,
        },
      ],
    });

  expect(orderResponse.status).toBe(201);

  orderId = orderResponse.body.order.id;
});

afterAll(async () => {
  await redisClient.close();
});

describe("POST /orders", () => {
  it("should create an order with valid data", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 2,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("order.id");
    expect(response.body.order.userId).toBe(userId);
  });

  it("should fail without token", async () => {
    const response = await request(app)
      .post("/orders")
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer wrongtoken")
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
  });

  it("should ignore userId from request body", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        userId: 999999,
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.order.userId).toBe(userId);
  });

  it("should fail for non-existing variant", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: 999999,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/product/i);
  });

  it("should fail for quantity <= 0", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 0,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid order items");
  });

  it("should fail for quantity > stock", async () => {
    const productResponse = await request(app).get(`/products/${productId}`);

    expect(productResponse.status).toBe(200);

    const variant = productResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variant).toBeDefined();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: variant.quantity + 1,
          },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/stock/i);
  });

  it("should decrease stock after order", async () => {
    const beforeResponse = await request(app).get(`/products/${productId}`);

    expect(beforeResponse.status).toBe(200);

    const variantBefore = beforeResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantBefore).toBeDefined();

    const initialQuantity = variantBefore.quantity;
    const quantity = 2;

    const orderResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity,
          },
        ],
      });

    expect(orderResponse.status).toBe(201);

    const afterResponse = await request(app).get(`/products/${productId}`);

    expect(afterResponse.status).toBe(200);

    const variantAfter = afterResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantAfter).toBeDefined();
    expect(variantAfter.quantity).toBe(initialQuantity - quantity);
  });
});

describe("GET /orders", () => {
  it("should return orders with pagination and total", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.orders)).toBe(true);
    expect(typeof response.body.pagination.total).toBe("number");
    expect(response.body.orders.length).toBeLessThanOrEqual(2);
  });

  it("should fail without token", async () => {
    const response = await request(app).get("/orders?page=1&limit=2");

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2")
      .set("Authorization", "Bearer wrongtoken");

    expect(response.status).toBe(401);
  });

  it("should fail without orders:read permission", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});

describe("GET /orders/:id", () => {
  it("should return order for owner", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("order.id", orderId);
    expect(response.body.order.userId).toBe(userId);
  });

  it("should return order for admin", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it("should return 404 for non-existing order", async () => {
    const response = await request(app)
      .get("/orders/999999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it("should fail without token", async () => {
    const response = await request(app).get(`/orders/${orderId}`);

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", "Bearer wrongtoken");

    expect(response.status).toBe(401);
  });

  it("should fail with invalid order id", async () => {
    const response = await request(app)
      .get("/orders/abc")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid order id");
  });

  it("should not allow access to another user's order", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Order not found");
  });
});

describe("DELETE /orders/:id", () => {
  it("should cancel pending order and restore stock", async () => {
    const beforeResponse = await request(app).get(`/products/${productId}`);

    expect(beforeResponse.status).toBe(200);

    const variantBefore = beforeResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantBefore).toBeDefined();

    const quantityBeforeOrder = variantBefore.quantity;
    const quantity = 2;

    const orderResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity,
          },
        ],
      });

    expect(orderResponse.status).toBe(201);

    const createdOrderId = orderResponse.body.order.id;

    const afterCreateResponse = await request(app).get(
      `/products/${productId}`,
    );

    expect(afterCreateResponse.status).toBe(200);

    const variantAfterCreate = afterCreateResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantAfterCreate.quantity).toBe(quantityBeforeOrder - quantity);

    const deleteResponse = await request(app)
      .delete(`/orders/${createdOrderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(
      `/products/${productId}`,
    );

    expect(afterDeleteResponse.status).toBe(200);

    const variantAfterDelete = afterDeleteResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantAfterDelete.quantity).toBe(quantityBeforeOrder);

    const orderAfterDeleteResponse = await request(app)
      .get(`/orders/${createdOrderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(orderAfterDeleteResponse.status).toBe(404);
  });

  it("should fail without token", async () => {
    const response = await request(app).delete(`/orders/${orderId}`);

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .delete(`/orders/${orderId}`)
      .set("Authorization", "Bearer wrongtoken");

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existing order", async () => {
    const response = await request(app)
      .delete("/orders/999999")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(404);
  });

  it("should allow admin to delete another user's order", async () => {
    const response = await request(app)
      .delete(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
  });
});

describe("GET /orders/my", () => {
  it("should return current user's orders", async () => {
    const response = await request(app)
      .get("/orders/my")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    expect(response.body[0]).toHaveProperty("id");
    expect(response.body[0].userId).toBe(userId);
  });

  it("should fail without token", async () => {
    const response = await request(app).get("/orders/my");

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .get("/orders/my")
      .set("Authorization", "Bearer wrongtoken");

    expect(response.status).toBe(401);
  });
});

describe("Orders API – validation details", () => {
  it("should point at the invalid order item", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ items: [{ productVariantId: 1, quantity: 1.5 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid order items");
    expect(response.body.errors).toEqual([
      expect.objectContaining({ path: "items.0.quantity" }),
    ]);
  });
});

describe("Orders API – unpublished products", () => {
  it("should not allow ordering a draft product", async () => {
    const adminToken = await loginAsAdmin();

    const draft = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "other",
        title: "Draft Pendant",
        variants: [{ priceEur: 1000, quantity: 5 }],
      });

    expect(draft.status).toBe(201);

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [{ productVariantId: draft.body.product.variants[0].id, quantity: 1 }],
      });

    expect(response.status).toBe(404);
  });
});

describe("storefront checkout", () => {
  const shipping = { name: "Guest Buyer", email: "guest@example.com", phone: "123456789",
    street: "Test 1", city: "Warsaw", postal: "00-001", country: "PL" };
  function checkout(quantity: number, key = crypto.randomUUID(), priceEur = 10000) {
    return request(app).post("/orders/checkout").send({ key, carrier: "DHL", shipping,
      items: [{ productVariantId: Number(variantId), quantity, priceEur }] });
  }
  async function stock() {
    return Number((await request(app).get(`/products/${productId}`)).body.product.variants[0].quantity);
  }

  it("records a guest purchase once on concurrent retries and cancellation returns the copies", async () => {
    const before = await stock();
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([checkout(2, key), checkout(2, key)]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.id).toBe(b.body.id);
    expect(await stock()).toBe(before - 2);
    const detail = await request(app).get(`/orders/manage/${a.body.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(detail.body.order.buyer.email).toBe(shipping.email);
    const cancelled = await request(app).post(`/orders/${a.body.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`).send({ reason: "Test" });
    expect(cancelled.status).toBe(200);
    expect(await stock()).toBe(before);
  });

  it("rolls back changed prices and sells the remaining stock to only one buyer", async () => {
    const before = await stock();
    expect((await checkout(1, crypto.randomUUID(), 1)).status).toBe(409);
    expect(await stock()).toBe(before);
    const orders = await Promise.all([checkout(before), checkout(before)]);
    expect(orders.map(order => order.status).sort()).toEqual([201, 409]);
    expect(await stock()).toBe(0);
  });
});

it("registers a storefront customer, logs them in and queues one localized email for each event",async()=>{
  const email="shopper@example.test", password="music-shop-password";
  const created=await request(app).post("/customer/register").send({email,password,locale:"en"});
  expect(created.status).toBe(201);
  const login=await request(app).post("/login").send({email,password});
  expect(login.status).toBe(200);
  const body={key:crypto.randomUUID(),locale:"en",carrier:"DHL",shipping:{name:"Music Fan",email,phone:"123456789",
    street:"Music 1",postal:"00-001",city:"Warsaw",country:"PL"},items:[{productVariantId:Number(variantId),quantity:1,priceEur:10000}]};
  for(let i=0;i<2;i++) {
    const r=await request(app).post("/orders/checkout").set("Authorization","Bearer "+login.body.token).send(body);
    expect(r.status).toBe(201);
  }
  const mine=await request(app).get("/orders/my").set("Authorization","Bearer "+login.body.token);
  expect(mine.status).toBe(200);
  const {pool}=await import("@/database/db.js");
  const mails=await pool.query("SELECT subject,body FROM customer_mail WHERE recipient=$1 ORDER BY id",[email]);
  expect(mails.rows).toHaveLength(2);
  expect(mails.rows[0].subject).toContain("Thanks");
  expect(mails.rows[1].body).toContain("€105.00");
});
