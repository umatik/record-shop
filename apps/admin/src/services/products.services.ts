import type {
  CreateProductInput,
  Product,
  ProductDetail,
  ProductList,
  ProductListFilters,
  PublishWarning,
  UpdateProductInput,
  UpdateVariantInput,
  Variant,
} from "@/types/product";
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

export function getProduct(productId: number) {
  return request<ProductDetail>(`/products/manage/${productId}`);
}

export function updateProduct(productId: number, input: UpdateProductInput) {
  return request<ProductDetail>(`/products/${productId}`, { method: "PATCH", json: input });
}

export async function unpublishProduct(productId: number) {
  await request(`/products/${productId}/unpublish`, { method: "POST" });
}

export async function deleteProduct(productId: number) {
  await request(`/products/${productId}`, { method: "DELETE" });
}

export async function createVariant(productId: number, input: CreateProductInput["variants"][number]) {
  const { variant } = await request<{ variant: Variant }>(`/products/${productId}/variants`, {
    method: "POST",
    json: input,
  });
  return variant;
}

export function updateVariant(productId: number, variantId: number, input: UpdateVariantInput) {
  return request(`/products/${productId}/variants/${variantId}`, { method: "PATCH", json: input });
}

/** Ostatniego wariantu opublikowanego produktu API nie usunie (409): wtedy usuwa się cały produkt. */
export async function deleteVariant(productId: number, variantId: number) {
  await request(`/products/${productId}/variants/${variantId}`, { method: "DELETE" });
}

export async function deleteMedia(mediaId: number) {
  await request(`/products/media/${mediaId}`, { method: "DELETE" });
}
