import { AppError } from "@/errors/app.error.js";
import type { OrderStatus } from "@/types/order.types.js";

/** Zmiana statusu niedozwolona z obecnego, np. anulowanie wysłanego zamówienia. */
export class OrderStatusConflictError extends AppError {
  constructor(action: string, status: OrderStatus) {
    super(`Cannot ${action} an order that is ${status}`, 409);
    this.name = "OrderStatusConflictError";
  }
}
