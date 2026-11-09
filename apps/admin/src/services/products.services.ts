import type { CreateProductInput, Product, ProductList, ProductListFilters, PublishWarning } from "@/types/product";
import { request, toQuery } from "./http";

export function getProducts({ status, q, page, limit }: ProductListFilters) {
  return request<ProductList>(`/products/manage?${toQuery({ status, q, page, limit, sort: "newest" })}`);
}

export async function createProduct(input: CreateProductInput) {
  const { product } = await request<{ product: Product }>("/products", { method: "POST", json: input });
  return product;
}

export async function publishProduct(productId: number) {
  const { warnings } = await request<{ warnings: PublishWarning[] }>(`/products/${productId}/publish`, {
    method: "POST",
  });
  return warnings;
}

/** Zdjęcie do wariantu, za zdjęciami już dodanymi (`sortOrder`). */
export function uploadVariantPhoto(variantId: number, file: File, sortOrder: number) {
  const form = new FormData();
  form.append("file", file);
  form.append("sortOrder", String(sortOrder));
  form.append("isPrimary", "false");
  return request(`/products/variants/${variantId}/media`, { method: "POST", form });
}
