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

type CatalogVariant = Pick<Variant, "id" | "priceEur" | "pricePln" | "quantity" | "attributes"> & {
  productId: number; title: string; artist: string; photo: string | null;
};
function toRelease({ attributes, photo, ...variant }: CatalogVariant) {
  return {
    ...variant,
    detail: [attributes.label, attributes.year, attributes.catalogNumber].filter(Boolean).join(" · "),
    condition: attributes.mediaCondition,
    format: attributes.format,
    photo: photo ? mediaUrl(photo) : null,
  };
}
export type Release = ReturnType<typeof toRelease>;

export async function getCatalog(page: number, sort: string) {
  const url = new URL("/products/catalog-variants", process.env.API_URL ?? "http://localhost:3000");
  url.search = new URLSearchParams({ sort, page: String(page), limit: "8" }).toString();
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("Catalogue API: " + res.status);
  const data: { copies: number; variants: CatalogVariant[]; pagination: { total: number; totalPages: number } } =
    await res.json();
  return { copies: data.copies, releases: data.variants.map(toRelease), ...data.pagination };
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
