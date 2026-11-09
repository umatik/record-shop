import "server-only";

type Variant = {
  id: number;
  pricePln?: number | null;
  priceEur: number;
  quantity: number;
  attributes: {
    format?: string;
    speed?: number;
    year?: number;
    label?: string;
    catalogNumber?: string;
    country?: string;
    pressing?: "original" | "reissue";
    mediaCondition?: string;
    sleeveCondition?: string;
    conditionNote?: Partial<Record<"en" | "pl" | "es", string>>;
    discogsReleaseId?: number;
  };
  media: { id: number; alt?: string; type: string; isPrimary: boolean; url: string }[];
};
type Product = {
  id: number;
  title: string;
  description?: string;
  type: string;
  primaryPhotoUrl: string | null;
  attributes: {
    artists?: string[];
    tracklist?: { position?: string; title: string; artists?: string[]; duration?: string }[];
    previewLinks?: string[];
    discogsMasterId?: number;
    discogsArtistIds?: number[];
  };
  variants: Variant[];
};

function toRelease(product: Product, variant: Variant) {
  const photos = variant.media.filter((m) => m.type === "photo");
  const photo = (photos.find((m) => m.isPrimary) ?? photos[0])?.url || product.primaryPhotoUrl;
  return {
    id: variant.id,
    productId: product.id,
    discogsReleaseId: variant.attributes.discogsReleaseId,
    discogsMasterId: product.attributes.discogsMasterId,
    detail: [
      variant.attributes.label,
      variant.attributes.year,
      variant.attributes.catalogNumber,
      variant.attributes.mediaCondition,
    ]
      .filter(Boolean)
      .join(" · "),
    title: product.title,
    artist: product.attributes.artists?.join(", ") ?? "",
    format: variant.attributes.format,
    priceEur: variant.priceEur,
    pricePln: variant.pricePln ?? null,
    quantity: variant.quantity,
    photo: photo ? mediaUrl(photo) : null,
  };
}

export type Release = ReturnType<typeof toRelease>;

export async function getCatalog(page: number) {
  const url = new URL("/products", process.env.API_URL ?? "http://localhost:3000");
  url.search = new URLSearchParams({ type: "vinyl", available: "true", page: String(page), limit: "8" }).toString();
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("Catalogue API: " + res.status);
  const data: { copies: number; products: Product[]; pagination: { total: number; totalPages: number } } =
    await res.json();
  return {
    copies: data.copies,
    releases: data.products.flatMap((p) => p.variants.filter((v) => v.quantity > 0).map((v) => toRelease(p, v))),
    ...data.pagination,
  };
}

export async function getProduct(id: number): Promise<Product | null> {
  const res = await fetch(new URL("/products/" + id, process.env.API_URL ?? "http://localhost:3000"), {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Product API: " + res.status);
  return (await res.json()).product;
}
export function mediaUrl(path: string) {
  return /^(https?:\/\/|\/)/.test(path) ? path : "/uploads/" + path;
}
