import type { Pagination } from "./common";

export type VinylFormat = "LP" | '12"' | '10"' | '7"';

export type ProductStatus = "published" | "draft";

export type Media = {
  id: number;
  type: "photo" | "video" | "audio";
  /** Pełny adres albo ścieżka względna pod `/uploads`. */
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type Variant = {
  id: number;
  productId: number;
  /** Eurocenty. */
  priceEur: number;
  pricePln?: number;
  quantity: number;
  attributes: Record<string, unknown>;
  media: Media[];
};

export type Product = {
  id: number;
  type: string;
  title: string;
  slug: string;
  isPublished: boolean;
  attributes: { artists?: string[]; previewLinks?: unknown[] } & Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
};

export type ProductList = {
  products: Product[];
  pagination: Pagination;
};

export type ProductListFilters = {
  status: ProductStatus;
  q?: string;
  page: number;
  limit: number;
};

/** Ciało `POST /products`: produkt z wariantami; zdjęcia labelu przez `photoUploadIds`. */
export type CreateProductInput = {
  type: "vinyl";
  title: string;
  description?: string;
  attributes: Record<string, unknown>;
  variants: {
    priceEur: number;
    quantity: number;
    photoUploadIds?: string[];
    attributes: Record<string, unknown>;
  }[];
};

/** Ostrzeżenia z publikacji, np. `missing_preview` (brak odsłuchu); nie blokują. */
export type PublishWarning = string;
