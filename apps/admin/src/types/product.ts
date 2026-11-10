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
  description: string | null;
  isPublished: boolean;
  attributes: {
    artists?: string[];
    previewLinks?: unknown[];
    tracklist?: { position?: string; title: string }[];
  } & Record<string, unknown>;
  /** Główne zdjęcie płyty (z pierwszego zdjęcia labelu albo podmienione w widoku produktu). */
  primaryPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
};

export type ProductList = {
  products: Product[];
  pagination: Pagination;
  /**
   * Sztuki na stanie i liczba presów we wszystkich pasujących płytach (tylko lista w panelu).
   * Z filtrem `available` presy to tylko te na stanie.
   */
  copies?: number;
  presses?: number;
};

/** Dodatkowe zawężenie listy w panelu. */
export type ProductListScope = {
  /** Tylko płyty z presem na stanie. */
  available?: boolean;
  /** Tylko płyty, którym nic nie brakuje do publikacji (jak puste `draftHints`). */
  ready?: boolean;
};

export type ProductListFilters = ProductListScope & {
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

/** Produkt w panelu z ostrzeżeniami (np. `missing_preview`), także szkic. */
export type ProductDetail = {
  product: Product;
  warnings: PublishWarning[];
};

/** `PATCH /products/:id`: `attributes` zastępują całe atrybuty produktu, więc trzeba wysłać komplet. */
export type UpdateProductInput = {
  title?: string;
  description?: string | null;
  attributes?: Record<string, unknown>;
};

/** `PATCH /products/:id/variants/:variantId`: `attributes` zastępują całe atrybuty wariantu. */
export type UpdateVariantInput = {
  priceEur?: number;
  quantity?: number;
  attributes?: Record<string, unknown>;
};
