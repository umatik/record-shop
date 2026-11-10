import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productVariantId: z.int().positive(),
        quantity: z.int().positive(),
      }),
    )
    .min(1)
    .max(100),
});

const addressField = z.string().trim().min(1).max(255);
export const checkoutSchema = z.object({
  key: z.uuid(),
  locale: z.enum(["pl","en","es"]).default("pl"),
  items: z.array(z.object({
    productVariantId: z.int().positive(),
    quantity: z.int().positive().max(2147483647),
    priceEur: z.int().nonnegative(),
  })).min(1).max(100),
  shipping: z.object({
    name: addressField, email: z.email().max(255), phone: addressField,
    street: addressField, city: addressField, postal: addressField, country: addressField,
  }),
  carrier: z.enum(["InPost", "DHL", "Poczta Polska"]),
});
export type Checkout = z.infer<typeof checkoutSchema>;
