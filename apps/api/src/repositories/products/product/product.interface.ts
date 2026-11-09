import type { PoolClient } from "pg";
import type {
  CreateProductRecord,
  Product,
  ProductDetails,
  ProductListQuery,
  ProductMatch,
  ProductStatus,
  UpdateProductRecord,
} from "@/types/product.types.js";

export type StockSummary = {
  /** Suma sztuk we wszystkich wariantach. */
  copies: number;
  /** Liczba wariantów (tłoczenie + stan), w panelu „presy”. */
  presses: number;
};

export interface ProductRepository {
  create(client: PoolClient, data: CreateProductRecord): Promise<Product>;

  /** `status` ogranicza wynik do opublikowanych lub szkiców; domyślnie zwraca każdy nieusunięty produkt. */
  findById(
    id: number,
    client: PoolClient,
    status?: ProductStatus,
  ): Promise<Product | null>;

  findAllWithVariants(
    client: PoolClient,
    query: ProductListQuery,
  ): Promise<ProductDetails[]>;

  countAll(
    client: PoolClient,
    query: Omit<ProductListQuery, "page" | "limit" | "sort">,
  ): Promise<number>;

  /** Stan magazynu produktów pasujących do filtrów: sztuki i warianty (liczniki w panelu). */
  stockSummary(
    client: PoolClient,
    query: Omit<ProductListQuery, "page" | "limit" | "sort">,
  ): Promise<StockSummary>;

  update(
    client: PoolClient,
    id: number,
    data: UpdateProductRecord,
  ): Promise<Product | null>;

  setPublished(
    client: PoolClient,
    id: number,
    isPublished: boolean,
  ): Promise<Product | null>;

  /**
   * Blokuje wiersz produktu do końca transakcji (`FOR UPDATE`). Każda zmiana, od której zależy, czy produkt
   * można kupić albo trwale usunąć (publikacja, wycofanie, usunięcie produktu lub wariantu), zaczyna od tej
   * blokady, a zamówienie bierze na produkcie blokadę współdzieloną. Zwraca `false`, gdy produktu nie ma.
   */
  lockForUpdate(client: PoolClient, id: number): Promise<boolean>;

  /** Czy któryś wariant produktu trafił kiedykolwiek do zamówienia. */
  hasOrders(client: PoolClient, id: number): Promise<boolean>;

  /** Ścieżki plików mediów wszystkich wariantów produktu (do usunięcia ze storage). */
  findMediaUrls(client: PoolClient, id: number): Promise<string[]>;

  /** Miękkie usunięcie (`is_deleted`). */
  delete(client: PoolClient, id: number): Promise<boolean>;

  /**
   * Produkty pasujące do dodawanej płyty: po ID wydania z Discogs, po numerze katalogowym (opcjonalnie
   * z wytwórnią), po master release z Discogs albo po tytule i artyście (nazwa albo numer z Discogs).
   * Parametry muszą być już znormalizowane (zob. `normalizeTitle`, `normalizeArtist` w serwisie).
   */
  findMatching(
    client: PoolClient,
    criteria: {
      discogsReleaseId: string | null;
      catalogNumber: string | null;
      label: string | null;
      title: string | null;
      artists: string[] | null;
      discogsMasterId: string | null;
      discogsArtistIds: number[] | null;
    },
    limit: number,
  ): Promise<ProductMatch[]>;

  /** Trwałe usunięcie razem z wariantami i mediami. */
  hardDelete(client: PoolClient, id: number): Promise<boolean>;

  /** Ustawia główne zdjęcie produktu i zwraca poprzedni adres (`undefined`, gdy produktu nie ma). */
  setPrimaryPhoto(client: PoolClient, id: number, url: string): Promise<string | null | undefined>;
}
