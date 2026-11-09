import { Router } from "express";
import type { OrderController } from "@/controllers/order.controller.js";
import { authenticationMiddleware } from "@/middleware/authentication.middleware.js";
import { requirePermission } from "@/middleware/permission.middleware.js";
import type { AuthorizationService } from "@/services/authorization.service.js";

export const createOrderRouter = (
  orderController: OrderController,
  authorizationService: AuthorizationService,
) => {
  const router = Router();

  /**
   * @openapi
   * /orders:
   *   get:
   *     tags:
   *       - Orders
   *     summary: Get all orders
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of orders
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    "/",
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:read"),
    orderController.getOrders,
  );

  const canManage = [
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:manage"),
  ];

  /**
   * @openapi
   * /orders/manage:
   *   get:
   *     tags: [Orders – admin panel]
   *     summary: Orders for the admin panel with buyer, items and totals
   *     description: >-
   *       The dashboard lists paid orders to ship, longest waiting since payment first
   *       (`status=paid&sort=paid_oldest`); `newest` and `oldest` sort by the order date. Each order has the
   *       buyer's contact details, items with the variant's primary photo path and `totalEur` in euro cents.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: query, name: status, schema: { type: string, enum: [all, pending, paid, shipped, delivered, cancelled], default: all } }
   *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest, paid_oldest], default: newest } }
   *       - { in: query, name: from, description: "First order day (Europe/Warsaw), inclusive", schema: { type: string, format: date } }
   *       - { in: query, name: to, description: "Last order day (Europe/Warsaw), inclusive", schema: { type: string, format: date } }
   *       - { in: query, name: q, description: "Buyer's name or e-mail, or the order number", schema: { type: string } }
   *       - { in: query, name: page, schema: { type: integer, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
   *     responses:
   *       200:
   *         description: "`orders` and `pagination`"
   *       400:
   *         description: Invalid query parameters
   *       403:
   *         description: Missing orders:manage
   */
  router.get("/manage", ...canManage, orderController.getManagedOrders);

  /**
   * @openapi
   * /orders/manage/summary:
   *   get:
   *     tags: [Orders – admin panel]
   *     summary: Dashboard numbers – shipping queue, pending payments and paid sales per day
   *     description: >-
   *       `toShip`, `pending` and `soldWithoutPaidAt` describe the current state. `sales` covers orders that are
   *       `paid`, `shipped` or `delivered` with `paid_at` in the last `days` days (today included), counted in
   *       Europe/Warsaw. Values are product totals in euro cents taken from the order items (price at purchase ×
   *       quantity). `sales.daily` has every day of the period, also days without sales.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: query, name: days, schema: { type: integer, enum: [7, 30], default: 30 } }
   *     responses:
   *       200:
   *         description: "`toShip`, `pending`, `soldWithoutPaidAt` and `sales`"
   *       400:
   *         description: Invalid query parameters
   *       403:
   *         description: Missing orders:manage
   */
  router.get("/manage/summary", ...canManage, orderController.getOrderSummary);

  /**
   * @openapi
   * /orders/manage/export:
   *   get:
   *     tags: [Orders – admin panel]
   *     summary: Download the order history as CSV or PDF (same filters as the list)
   *     description: CSV has one row per item, PDF is a summary with each order's items. Max 5000 orders.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, pdf] } }
   *       - { in: query, name: status, schema: { type: string, enum: [all, pending, paid, shipped, delivered, cancelled], default: all } }
   *       - { in: query, name: from, schema: { type: string, format: date } }
   *       - { in: query, name: to, schema: { type: string, format: date } }
   *       - { in: query, name: q, schema: { type: string } }
   *     responses:
   *       200:
   *         description: The file as an attachment
   *       400:
   *         description: Invalid filters, or more than 5000 orders
   *       403:
   *         description: Missing orders:manage
   */
  router.get(
    "/manage/export",
    ...canManage,
    orderController.exportManagedOrders,
  );

  /**
   * @openapi
   * /orders/manage/export/email:
   *   post:
   *     tags: [Orders – admin panel]
   *     summary: Send the order history export by e-mail to ORDERS_EXPORT_EMAIL
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, pdf] } }
   *       - { in: query, name: status, schema: { type: string, enum: [all, pending, paid, shipped, delivered, cancelled], default: all } }
   *       - { in: query, name: from, schema: { type: string, format: date } }
   *       - { in: query, name: to, schema: { type: string, format: date } }
   *       - { in: query, name: q, schema: { type: string } }
   *     responses:
   *       200:
   *         description: E-mail sent
   *       400:
   *         description: Invalid filters, or more than 5000 orders
   *       409:
   *         description: ORDERS_EXPORT_EMAIL is not set
   */
  router.post(
    "/manage/export/email",
    ...canManage,
    orderController.emailManagedOrders,
  );

  /**
   * @openapi
   * /orders/manage/{id}:
   *   get:
   *     tags: [Orders – admin panel]
   *     summary: One order for the admin panel (any buyer)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: integer } }
   *     responses:
   *       200:
   *         description: Order found
   *       404:
   *         description: Order not found
   */
  router.get("/manage/:id", ...canManage, orderController.getManagedOrder);

  /**
   * @openapi
   * /orders/{id}/mark-paid:
   *   post:
   *     tags: [Orders – admin panel]
   *     summary: Confirm payment by hand (e.g. bank transfer) until Stripe handles payments
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: integer } }
   *     responses:
   *       200:
   *         description: Order is paid
   *       404:
   *         description: Order not found
   *       409:
   *         description: Order is not pending
   */
  router.post("/:id/mark-paid", ...canManage, orderController.markOrderPaid);

  /**
   * @openapi
   * /orders/{id}/cancel:
   *   post:
   *     tags: [Orders – admin panel]
   *     summary: Cancel a pending or paid order; its records go back on sale
   *     description: The reason is meant for the buyer. Refunds come with Stripe.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: integer } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason: { type: string, maxLength: 1000 }
   *     responses:
   *       200:
   *         description: Order cancelled
   *       400:
   *         description: Missing reason
   *       404:
   *         description: Order not found
   *       409:
   *         description: Order is already shipped, delivered or cancelled
   */
  router.post("/:id/cancel", ...canManage, orderController.cancelOrder);

  /**
   * @openapi
   * /orders:
   *   post:
   *     tags:
   *       - Orders
   *     summary: Create an order
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       201:
   *         description: Order created
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    "/",
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:create"),
    orderController.createOrder,
  );

  /**
   * @openapi
   * /orders/my:
   *   get:
   *     tags:
   *       - Orders
   *     summary: Get current user's orders
   *     description: Returns all orders belonging to the authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of current user's orders
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/OrderDetails"
   *       401:
   *         description: Unauthorized
   */
  router.get("/my", authenticationMiddleware, orderController.getMyOrders);

  /**
   * @openapi
   * /orders/{id}:
   *   get:
   *     tags:
   *       - Orders
   *     summary: Get order by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Order found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Order not found
   */
  router.get("/:id", authenticationMiddleware, orderController.getOrder);

  /**
   * @openapi
   * /orders/{id}:
   *   delete:
   *     tags:
   *       - Orders
   *     summary: Delete order
   *     description: Soft delete an order
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Order deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Order not found
   */
  router.delete(
    "/:id",
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:delete"),
    orderController.deleteOrder,
  );

  return router;
};
