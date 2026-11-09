import { randomUUID } from "node:crypto";
import { LastPublishedVariantError } from "@/errors/last-published-variant.error.js";
import type {
  CreateProductData,
  PricedProductDetails,
  PricedProductVariant,
  ProductDetails,
  ProductListQuery,
  ProductMatch,
  ProductMatchCriteria,
  ProductStatus,
  UpdateProductData,
} from "@/types/product.types.js";
import type {
  CreateProductVariantInput,
  ProductVariant,
  UpdateProductVariantData,
} from "@/types/product-variant.types.js";
import type { Cache } from "@/cache/cache.interface.js";
import type { Database } from "@/database/database.interface.js";
import type { ProductRepository, StockSummary } from "@/repositories/products/product/product.interface.js";
import type { ProductVariantRepository } from "@/repositories/products/product-variant/product-variant.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import { UnsupportedMediaTypeError } from "@/errors/unsupported-media-type.js";
import {
  PENDING_UPLOAD_TTL_MS,
  type PendingUploadRepository,
} from "@/repositories/pending-upload/pending-upload.interface.js";
import type { ProductVariantMediaInterface } from "@/repositories/products/product-media/product-variant-media.interface.js";
import { ProductVariantMediaType } from "@/types/product-variant-media.types.js";
import {
  getProductType,
  type ProductTypeDefinition,
} from "@/product-types/index.js";
import { ValidationError } from "@/errors/validation.error.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";
import { slugify } from "@/utils/slugify.js";
import {
  convertEurToPln,
  type ExchangeRateProvider,
} from "@/services/exchange-rate.service.js";

export type ProductListCache = Cache<{
  products: ProductDetails[];
  total: number;
  stock: StockSummary;
}>;

const LIST_CACHE_TTL_SECONDS = 60;
const MATCH_LIMIT = 10;

/** Kod błędu PostgreSQL: naruszenie klucza obcego. */
const FOREIGN_KEY_VIOLATION = "23503";

/** Główne zdjęcie produktu: te same formaty co zdjęcia labelu. */
const PRIMARY_PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Tytuł do porównania: tylko część przed „/” (strona A), małe litery, bez spacji i znaków.
 * „Moulding / Africa” i „Moulding” dają to samo. Tak samo liczy to zapytanie w repozytorium.
 */
export const normalizeTitle = (title: string) =>
  (title.split("/")[0] ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Artysta do porównania: bez numeru z Discogs („(2)”), gwiazdki i spacji („I Jahman*” = „Ijahman”). */
export const normalizeArtist = (artist: string) =>
  artist.replace(/\s*\(\d+\)$/, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private productVariantRepository: ProductVariantRepository,
    private pool: Database,
    private cache: ProductListCache,
    private storage: Storage,
    private exchangeRates: ExchangeRateProvider,
    private pendingUploads: PendingUploadRepository,
    private productVariantMediaRepository: ProductVariantMediaInterface,
  ) {}

  // ------------------------------------------------------------------
  // Produkty
  // ------------------------------------------------------------------

  /** Tworzy produkt jako szkic (niewidoczny w sklepie). */
  async createProduct(data: CreateProductData): Promise<PricedProductDetails> {
    const type = this.getType(data.type);
    const attributes = this.parseAttributes(
      type.productAttributes,
      data.attributes,
      "attributes",
    );
    const variants = data.variants.map((variant, index) => ({
      ...variant,
      attributes: this.parseAttributes(
        type.variantAttributes,
        variant.attributes,
        `variants.${index}.attributes`,
      ),
    }));

    const product = await this.inTransaction(async (client) => {
      const created = await this.productRepository.create(client, {
        type: type.key,
        title: data.title,
        description: data.description ?? null,
        attributes,
        slugBase: this.buildSlugBase(type, data.title, attributes),
      });

      const createdVariants: ProductVariant[] = [];

      for (const [index, variant] of variants.entries()) {
        createdVariants.push(
          await this.createVariantWithPhotos(client, created.id, variant, `variants.${index}`),
        );
      }

      return { ...created, variants: createdVariants };
    });

    if (!product) {
      throw new Error("Product was not created");
    }

    // Pierwsze zdjęcie labelu staje się głównym zdjęciem produktu (osobna kopia pliku, żeby usunięcie
    // zdjęcia wariantu go nie ruszało).
    const labelPhoto = product.variants[0]?.media[0]?.url;

    if (labelPhoto) {
      product.primaryPhotoUrl = await this.copyAsPrimaryPhoto(product.id, labelPhoto);
    }

    await this.cache.clear();

    return this.withPln(product);
  }

  /**
   * Zastępuje główne zdjęcie produktu wgranym plikiem; stary plik jest usuwany po zapisie.
   * Zwraca `null`, gdy produktu nie ma.
   */
  async replacePrimaryPhoto(
    id: number,
    file: Buffer,
    contentType: string,
  ): Promise<string | null> {
    const extension = PRIMARY_PHOTO_EXTENSIONS[contentType];

    if (!extension) {
      throw new UnsupportedMediaTypeError();
    }

    const url = await this.storage.save(
      file,
      `products/${id}/main-${randomUUID()}.${extension}`,
      contentType,
    );
    const previous = await this.withClient((client) =>
      this.productRepository.setPrimaryPhoto(client, id, url),
    );

    if (previous === undefined) {
      await this.deleteFiles([url]);
      return null;
    }

    if (previous) {
      await this.deleteFiles([previous]);
    }

    await this.cache.clear();

    return url;
  }

  async updateProduct(
    id: number,
    data: UpdateProductData,
  ): Promise<PricedProductDetails | null> {
    const product = await this.inTransaction(async (client) => {
      const existing = await this.productRepository.findById(id, client);

      if (!existing) {
        return null;
      }

      const type = this.getType(existing.type);

      const updated = await this.productRepository.update(client, id, {
        title: data.title,
        description: data.description,
        attributes:
          data.attributes === undefined
            ? undefined
            : this.parseAttributes(
                type.productAttributes,
                data.attributes,
                "attributes",
              ),
      });

      if (!updated) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      return { ...updated, variants };
    });

    if (!product) {
      return null;
    }

    await this.cache.clear();

    return this.withPln(product);
  }

  /** Zwraca produkt z wariantami; `status` pozwala ukryć szkice przed sklepem. */
  async getProduct(
    id: number,
    status: ProductStatus = "published",
  ): Promise<PricedProductDetails | null> {
    const product = await this.withClient(async (client) => {
      const found = await this.productRepository.findById(id, client, status);

      if (!found) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      return { ...found, variants };
    });

    return product ? this.withPln(product) : null;
  }

  async getAllProducts(query: ProductListQuery): Promise<{
    products: PricedProductDetails[];
    total: number;
    /** Stan we wszystkich pasujących produktach (nie tylko na tej stronie). */
    stock: StockSummary;
  }> {
    // Cache tylko dla sklepu i bez wyszukiwania tekstowego (każde zapytanie byłoby inne).
    // Generację odczytujemy przed pobraniem danych: jeśli w trakcie ktoś zmieni produkty i wyczyści cache,
    // nasz spóźniony zapis trafi do starej generacji i nie zostanie już odczytany (audyt 2026-11-08, R2).
    const cacheKey =
      query.status === "published" && query.q === undefined
        ? this.buildListCacheKey(query, await this.cache.generation())
        : null;

    const result =
      (cacheKey ? await this.cache.get(cacheKey) : null) ??
      (await this.withClient(async (client) => {
        // Lista i licznik z jednego obrazu bazy, żeby `total` zgadzał się z `products`.
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

        try {
          const products = await this.productRepository.findAllWithVariants(
            client,
            query,
          );
          const total = await this.productRepository.countAll(client, query);
          const stock = await this.productRepository.stockSummary(client, query);
          await client.query("COMMIT");

          const loaded = { products, total, stock };

          if (cacheKey) {
            await this.cache.set(cacheKey, loaded, LIST_CACHE_TTL_SECONDS);
          }

          return loaded;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }));

    const rate = await this.exchangeRates.getEurPlnRate();

    return {
      products: result.products.map((product) => this.withRate(product, rate)),
      total: result.total,
      stock: result.stock,
    };
  }

  /**
   * Publikuje produkt. Wymaga co najmniej jednego wariantu; brak odsłuchu i inne braki
   * nie blokują publikacji, tylko trafiają do `warnings`.
   */
  async publishProduct(
    id: number,
  ): Promise<{ product: PricedProductDetails; warnings: string[] } | null> {
    const product = await this.inTransaction(async (client) => {
      if (!(await this.productRepository.lockForUpdate(client, id))) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      if (variants.length === 0) {
        throw new ValidationError("Product cannot be published", [
          { path: "variants", message: "At least one variant is required" },
        ]);
      }

      const published = await this.productRepository.setPublished(
        client,
        id,
        true,
      );

      return published ? { ...published, variants } : null;
    });

    if (!product) {
      return null;
    }

    await this.cache.clear();

    return { product: await this.withPln(product), warnings: this.getWarnings(product) };
  }

  async unpublishProduct(id: number): Promise<PricedProductDetails | null> {
    const product = await this.inTransaction(async (client) => {
      const unpublished = await this.productRepository.setPublished(
        client,
        id,
        false,
      );

      if (!unpublished) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      return { ...unpublished, variants };
    });

    if (!product) {
      return null;
    }

    await this.cache.clear();

    return this.withPln(product);
  }

  /**
   * Szkic, którego nikt nie zamówił, usuwamy trwale razem z plikami.
   * Produkt opublikowany (albo z zamówieniami) usuwamy miękko, bo mogą się do niego odwoływać zamówienia.
   */
  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.inTransaction(async (client) => {
      // Blokada przed sprawdzeniem statusu i zamówień: do końca transakcji nikt nie opublikuje ani nie kupi
      // tego produktu, więc decyzja o trwałym usunięciu pozostaje aktualna.
      if (!(await this.productRepository.lockForUpdate(client, id))) {
        return null;
      }

      const product = await this.productRepository.findById(id, client);

      if (!product) {
        return null;
      }

      const softDelete = async () =>
        (await this.productRepository.delete(client, id)) ? { mediaUrls: [] as string[] } : null;

      if (product.isPublished || (await this.productRepository.hasOrders(client, id))) {
        return softDelete();
      }

      const mediaUrls = await this.productRepository.findMediaUrls(client, id);
      const hardDeleted = await this.tryHardDelete(client, () =>
        this.productRepository.hardDelete(client, id),
      );

      if (hardDeleted === "referenced") {
        return softDelete();
      }

      return hardDeleted ? { mediaUrls } : null;
    });

    if (!result) {
      return false;
    }

    await this.deleteFiles(result.mediaUrls);
    await this.cache.clear();

    return true;
  }

  /**
   * Szuka istniejących produktów, do których pasuje dodawana płyta, żeby kreator mógł zaproponować dodanie
   * wariantu zamiast nowego produktu. Normalizuje dane: wielkość liter, a w numerze katalogowym także spacje
   * i myślniki („ZV-7-006” = „zv 7 006”).
   */
  async findMatchingProducts(criteria: ProductMatchCriteria): Promise<ProductMatch[]> {
    const normalized = {
      discogsReleaseId:
        criteria.discogsReleaseId === undefined ? null : String(criteria.discogsReleaseId),
      catalogNumber:
        criteria.catalogNumber?.toLowerCase().replace(/[^a-z0-9]/g, "") || null,
      label: criteria.label?.trim().toLowerCase() || null,
      title: criteria.title ? normalizeTitle(criteria.title) || null : null,
      artists: criteria.artists?.length
        ? criteria.artists.map(normalizeArtist).filter(Boolean)
        : null,
      discogsMasterId:
        criteria.discogsMasterId === undefined ? null : String(criteria.discogsMasterId),
      discogsArtistIds: criteria.discogsArtistIds?.length ? criteria.discogsArtistIds : null,
    };

    if (
      !normalized.discogsReleaseId &&
      !normalized.catalogNumber &&
      !normalized.title &&
      !normalized.discogsMasterId
    ) {
      return [];
    }

    return this.withClient((client) =>
      this.productRepository.findMatching(client, normalized, MATCH_LIMIT),
    );
  }

  /** Ostrzeżenia typu produktu (np. `missing_preview`), które nie blokują publikacji. */
  getWarnings(product: ProductDetails): string[] {
    return getProductType(product.type)?.warnings?.(product) ?? [];
  }

  // ------------------------------------------------------------------
  // Warianty
  // ------------------------------------------------------------------

  async createVariant(
    productId: number,
    data: CreateProductVariantInput,
  ): Promise<PricedProductVariant | null> {
    const variant = await this.inTransaction(async (client) => {
      const product = await this.productRepository.findById(productId, client);

      if (!product) {
        return null;
      }

      const type = this.getType(product.type);

      return this.createVariantWithPhotos(
        client,
        productId,
        {
          ...data,
          attributes: this.parseAttributes(
            type.variantAttributes,
            data.attributes,
            "attributes",
          ),
        },
        "",
      );
    });

    if (!variant) {
      return null;
    }

    // Płyta bez głównego zdjęcia (np. dodana przed tą funkcją) dostaje zdjęcie labelu nowego wariantu.
    // Istniejącego głównego zdjęcia nowy wariant nie zmienia.
    const labelPhoto = variant.media[0]?.url;
    const product = labelPhoto ? await this.withClient((client) => this.productRepository.findById(productId, client)) : null;

    if (labelPhoto && product && !product.primaryPhotoUrl) {
      await this.copyAsPrimaryPhoto(productId, labelPhoto);
    }

    await this.cache.clear();

    return this.variantWithPln(variant);
  }

  /** Wariant produktu z mediami; `null`, gdy nie ma go albo należy do innego produktu. */
  async findVariant(productId: number, variantId: number): Promise<ProductVariant | null> {
    const variant = await this.withClient((client) =>
      this.productVariantRepository.findById(client, variantId),
    );

    return variant && !variant.isDeleted && variant.productId === productId ? variant : null;
  }

  async updateVariant(
    productId: number,
    variantId: number,
    data: UpdateProductVariantData,
  ): Promise<PricedProductVariant | null> {
    const variant = await this.inTransaction(async (client) => {
      const product = await this.productRepository.findById(productId, client);
      const existing = await this.productVariantRepository.findById(
        client,
        variantId,
      );

      if (!product || !existing || existing.productId !== productId) {
        return null;
      }

      const type = this.getType(product.type);

      await this.productVariantRepository.update(client, variantId, {
        priceEur: data.priceEur,
        quantity: data.quantity,
        attributes:
          data.attributes === undefined
            ? undefined
            : this.parseAttributes(
                type.variantAttributes,
                data.attributes,
                "attributes",
              ),
      });

      // Ponowny odczyt zwraca wariant razem z mediami.
      return this.productVariantRepository.findById(client, variantId);
    });

    if (!variant) {
      return null;
    }

    await this.cache.clear();

    return this.variantWithPln(variant);
  }

  /** Wariant szkicu bez zamówień usuwamy trwale razem z plikami, w pozostałych przypadkach miękko. */
  async deleteProductVariant(
    productId: number,
    variantId: number,
  ): Promise<boolean> {
    const result = await this.inTransaction(async (client) => {
      // Ta sama blokada co przy usuwaniu produktu: publikacja i zamówienia czekają do końca transakcji.
      await this.productRepository.lockForUpdate(client, productId);

      const variant = await this.productVariantRepository.findById(
        client,
        variantId,
      );

      if (!variant || variant.productId !== productId) {
        return null;
      }

      const product = await this.productRepository.findById(productId, client);

      // Pod blokadą produktu, więc dwa równoległe usunięcia nie zejdą razem do zera wariantów.
      if (product?.isPublished) {
        const variants = await this.productVariantRepository.findByProductId(client, productId);

        if (variants.length <= 1) {
          throw new LastPublishedVariantError();
        }
      }

      const softDelete = async () =>
        (await this.productVariantRepository.delete(client, variantId))
          ? { mediaUrls: [] as string[] }
          : null;

      if (
        !product ||
        product.isPublished ||
        (await this.productVariantRepository.hasOrders(client, variantId))
      ) {
        return softDelete();
      }

      const mediaUrls = await this.productVariantRepository.findMediaUrls(
        client,
        variantId,
      );
      const hardDeleted = await this.tryHardDelete(client, () =>
        this.productVariantRepository.hardDelete(client, variantId),
      );

      if (hardDeleted === "referenced") {
        return softDelete();
      }

      return hardDeleted ? { mediaUrls } : null;
    });

    if (!result) {
      return false;
    }

    await this.deleteFiles(result.mediaUrls);
    await this.cache.clear();

    return true;
  }

  // ------------------------------------------------------------------
  // Pomocnicze
  // ------------------------------------------------------------------

  private async withClient<T>(
    work: (client: Awaited<ReturnType<Database["connect"]>>) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  /** BEGIN/COMMIT wokół `work`; `null` z `work` oznacza „nie znaleziono” i kończy się ROLLBACK. */
  /**
   * Trwałe usunięcie w punkcie zapisu: gdy baza odmówi, bo wiersz ma pozycje zamówień (ON DELETE RESTRICT),
   * transakcja wraca do stanu sprzed usunięcia, a serwis usuwa miękko. Przy blokadach to nie powinno się zdarzyć;
   * to zabezpieczenie na wypadek nowej ścieżki zamówień, która blokady nie weźmie.
   */
  private async tryHardDelete(
    client: Awaited<ReturnType<Database["connect"]>>,
    hardDelete: () => Promise<boolean>,
  ): Promise<boolean | "referenced"> {
    await client.query("SAVEPOINT hard_delete");

    try {
      const deleted = await hardDelete();
      await client.query("RELEASE SAVEPOINT hard_delete");
      return deleted;
    } catch (error) {
      if ((error as { code?: unknown }).code !== FOREIGN_KEY_VIOLATION) {
        throw error;
      }

      await client.query("ROLLBACK TO SAVEPOINT hard_delete");
      return "referenced";
    }
  }

  private async inTransaction<T>(
    work: (client: Awaited<ReturnType<Database["connect"]>>) => Promise<T | null>,
  ): Promise<T | null> {
    return this.withClient(async (client) => {
      await client.query("BEGIN");

      try {
        const result = await work(client);

        await client.query(result === null ? "ROLLBACK" : "COMMIT");

        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  }

  /**
   * Tworzy wariant i podpina zdjęcia zapisane przy rozpoznawaniu płyty: pierwsze jako główne, kolejne po nim.
   * Nieznane albo już użyte identyfikatory kończą się błędem walidacji (cała transakcja jest wycofywana).
   */
  private async createVariantWithPhotos(
    client: Awaited<ReturnType<Database["connect"]>>,
    productId: number,
    data: CreateProductVariantInput,
    path: string,
  ): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.create(client, {
      productId,
      priceEur: data.priceEur,
      quantity: data.quantity,
      attributes: data.attributes,
    });

    const ids = data.photoUploadIds ?? [];

    if (ids.length === 0) {
      return variant;
    }

    const uploads = await this.pendingUploads.claim(client, ids, PENDING_UPLOAD_TTL_MS);

    if (uploads.length !== new Set(ids).size || uploads.length !== ids.length) {
      throw new ValidationError("Invalid product data", [
        {
          path: path ? `${path}.photoUploadIds` : "photoUploadIds",
          message: "Unknown, expired or already used photo upload",
        },
      ]);
    }

    for (const [index, upload] of uploads.entries()) {
      variant.media.push(
        await this.productVariantMediaRepository.create(
          client,
          variant.id,
          ProductVariantMediaType.PHOTO,
          upload.path,
          null,
          index,
          index === 0,
        ),
      );
    }

    return variant;
  }

  /** Kopiuje zdjęcie jako główne zdjęcie produktu. Błąd kopiowania nie psuje zapisu płyty: zostaje bez zdjęcia. */
  private async copyAsPrimaryPhoto(productId: number, source: string): Promise<string | null> {
    const extension = source.split(".").pop() ?? "jpg";

    try {
      const url = await this.storage.copy(source, `products/${productId}/main-${randomUUID()}.${extension}`);
      await this.withClient((client) => this.productRepository.setPrimaryPhoto(client, productId, url));
      return url;
    } catch (error) {
      console.error(`Failed to set the primary photo of product ${productId}:`, error);
      return null;
    }
  }

  private async deleteFiles(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        await this.storage.delete(url);
      } catch (error) {
        console.error(`Failed to delete media file "${url}":`, error);
      }
    }
  }

  private async withPln(product: ProductDetails): Promise<PricedProductDetails> {
    return this.withRate(product, await this.exchangeRates.getEurPlnRate());
  }

  private async variantWithPln(
    variant: ProductVariant,
  ): Promise<PricedProductVariant> {
    const rate = await this.exchangeRates.getEurPlnRate();

    return {
      ...variant,
      pricePln: rate === null ? null : convertEurToPln(variant.priceEur, rate),
    };
  }

  private withRate(
    product: ProductDetails,
    rate: number | null,
  ): PricedProductDetails {
    return {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        pricePln: rate === null ? null : convertEurToPln(variant.priceEur, rate),
      })),
    };
  }

  /**
   * Klucz cache listy: posortowane pary parametrów zapisane jako JSON. Zwykłe łączenie `klucz=wartość` dwukropkami
   * było niejednoznaczne, bo wartość filtra może zawierać `:` i `=` (np. artysta `Bob:format=LP` dawał ten sam klucz
   * co artysta `Bob` z formatem `LP`).
   */
  private buildListCacheKey(query: ProductListQuery, generation: string): string {
    const params = Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return `products:list:${generation}:${JSON.stringify(params)}`;
  }

  private getType(key: string): ProductTypeDefinition {
    const type = getProductType(key);

    if (!type) {
      throw new ValidationError("Invalid product data", [
        { path: "type", message: "Unknown product type" },
      ]);
    }

    return type;
  }

  private parseAttributes(
    schema: ProductTypeDefinition["productAttributes"],
    attributes: Record<string, unknown>,
    path: string,
  ): Record<string, unknown> {
    const result = schema.safeParse(attributes);

    if (!result.success) {
      throw new ValidationError(
        "Invalid product data",
        formatZodIssues(result.error).map((issue) => ({
          ...issue,
          path: issue.path ? `${path}.${issue.path}` : path,
        })),
      );
    }

    return result.data;
  }

  private buildSlugBase(
    type: ProductTypeDefinition,
    title: string,
    attributes: Record<string, unknown>,
  ): string {
    const parts = [...(type.slugParts?.(attributes) ?? []), title];

    return slugify(parts.join(" ")) || "product";
  }
}
