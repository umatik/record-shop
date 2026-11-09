// Ręczne typy na czas prototypu. Docelowo generowane z /api-docs.json (openapi-typescript).

export interface Media {
  id: number;
  type: "photo" | "video" | "audio";
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Variant {
  id: number;
  productId: number;
  priceEur: number;
  pricePln?: number;
  quantity: number;
  attributes: Record<string, unknown>;
  media: Media[];
}

export interface Product {
  id: number;
  type: string;
  title: string;
  slug: string;
  isPublished: boolean;
  attributes: { artists?: string[]; previewLinks?: unknown[] } & Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductList {
  products: Product[];
  pagination: Pagination;
}

export interface Me {
  user: { id: string; email: string; firstName?: string; lastName?: string };
  permissions: string[];
}

export interface Setting {
  key: string;
  group: string;
  kind: "text" | "secret" | "select" | "number";
  isSet: boolean;
  source: "database" | "environment" | "default" | null;
  value?: unknown;
  maskedValue?: string;
}

// Kreator dodawania płyty (endpointy /products/lookup/*).

export type VinylFormat = "LP" | '12"' | '10"' | '7"';

export interface LabelReading {
  artists: string[];
  title: string | null;
  label: string | null;
  catalogNumber: string | null;
  year: number | null;
  format: VinylFormat | null;
  speed: number | null;
  sides: { side: string; title: string; artists: string[] }[];
}

export interface ReleaseCandidate {
  releaseId: number;
  title: string | null;
  thumbnail: string | null;
  label: string | null;
  catalogNumber: string | null;
  year: number | null;
  country: string | null;
  formats: string[];
}

export interface PhotoLookup {
  reading: LabelReading;
  candidates: ReleaseCandidate[];
  photoUploadIds: string[];
}

export interface ReleaseDraft {
  product: {
    type: "vinyl";
    title: string;
    description: string | null;
    attributes: {
      artists: string[];
      tracklist: { position?: string; title: string; artists?: string[]; duration?: string }[];
      previewLinks: string[];
    };
  };
  variant: {
    attributes: {
      format?: VinylFormat;
      speed?: 33 | 45;
      year?: number;
      label?: string;
      catalogNumber?: string;
      country?: string;
      pressing?: "reissue";
      discogsReleaseId: number;
    };
  };
}

export interface ProductMatch {
  productId: number;
  type: string;
  title: string;
  artists: string[];
  isPublished: boolean;
  matchedBy: ("discogs_release" | "catalog_number" | "title_artist")[];
  matchingVariantIds: number[];
}

// Zamówienia w panelu (GET /orders/manage).

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface OrderBuyer {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface ManagedOrderItem {
  id: number;
  productId: number;
  productVariantId: number;
  productTitle: string;
  artists: string[];
  quantity: number;
  /** Eurocenty z chwili zakupu. */
  priceEur: number;
  photoUrl: string | null;
  variantAttributes: Record<string, unknown>;
}

export interface ManagedOrder {
  id: number;
  status: OrderStatus;
  totalEur: number;
  buyer: OrderBuyer;
  items: ManagedOrderItem[];
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface ManagedOrderList {
  orders: ManagedOrder[];
  pagination: Pagination;
}
