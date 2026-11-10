import type {
  CreateProductInput,
  Media,
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

export function getProducts({ status, q, page, limit, available, ready }: ProductListFilters) {
  const scope = { available: available ? "true" : undefined, ready: ready ? "true" : undefined };
  return request<ProductList>(`/products/manage?${toQuery({ status, q, page, limit, sort: "newest", ...scope })}`);
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

/** Plik audio (mp3/wav) do wariantu; API sam rozpoznaje typ `audio` po rozszerzeniu i typie MIME. */
export function uploadVariantAudio(variantId: number, file: File, alt: string | null) {
  const form = new FormData();
  form.append("file", file);
  form.append("sortOrder", "0");
  form.append("isPrimary", "false");
  // Tytuł utworu: po nim lista wyboru pomija utwór, który już ma plik.
  if (alt) form.append("alt", alt);
  return request(`/products/variants/${variantId}/media`, { method: "POST", form });
}

/** Zdjęcie do wariantu, za zdjęciami już dodanymi (`sortOrder`). */
export function uploadVariantPhoto(variantId: number, file: File, sortOrder: number) {
  const form = new FormData();
  form.append("file", file);
  form.append("sortOrder", String(sortOrder));
  form.append("isPrimary", "false");
  return request(`/products/variants/${variantId}/media`, { method: "POST", form });
}

/** Okładka wydania z Discogs (po `discogsReleaseId` wariantu) jako kolejne zdjęcie wariantu. */
export function addDiscogsCover(productId: number, variantId: number) {
  return request(`/products/${productId}/variants/${variantId}/discogs-cover`, { method: "POST" });
}

export function replaceProductPhoto(productId: number, file: File) {
  const form = new FormData();
  form.append("image", file);
  return request<{ primaryPhotoUrl: string }>(`/products/${productId}/photo`, { method: "PUT", form });
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

/** Ustawia zdjęcie jako główne wariantu (API zdejmuje flagę z poprzedniego). */
export function setPrimaryMedia(media: Media) {
  return request(`/products/media/${media.id}`, {
    method: "PATCH",
    json: { alt: media.alt, sortOrder: media.sortOrder, isPrimary: true },
  });
}

export async function deleteMedia(mediaId: number) {
  await request(`/products/media/${mediaId}`, { method: "DELETE" });
}
