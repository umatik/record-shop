import type { VinylFormat } from "./product";

/** Odczyt labelu przez Claude; pola nieczytelne są `null`. */
export type LabelReading = {
  artists: string[];
  title: string | null;
  label: string | null;
  catalogNumber: string | null;
  year: number | null;
  format: VinylFormat | null;
  speed: number | null;
  sides: { side: string; title: string; artists: string[] }[];
};

export type ReleaseCandidate = {
  releaseId: number;
  title: string | null;
  thumbnail: string | null;
  label: string | null;
  catalogNumber: string | null;
  year: number | null;
  country: string | null;
  formats: string[];
};

/**
 * Wynik odczytu zdjęcia. Gdy Claude albo Discogs zawiodą, zdjęcia i tak są zapisane (`photoUploadIds`),
 * a kreator przechodzi do wpisania ręcznego.
 */
export type LabelLookupResult =
  | { kind: "found"; reading: LabelReading; candidates: ReleaseCandidate[]; photoUploadIds: string[] }
  | { kind: "failed"; message: string; reading: LabelReading | null; photoUploadIds: string[] };

/** Wyszukiwanie na Discogs po poprawionym odczycie. */
export type ReleaseSearchQuery = {
  artist: string;
  title: string;
  label: string;
  catalogNumber: string;
};

export type ReleaseDraft = {
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
};

/** Produkt w sklepie, do którego płyta może należeć. */
export type ProductMatch = {
  productId: number;
  type: string;
  title: string;
  artists: string[];
  isPublished: boolean;
  matchedBy: ("discogs_release" | "catalog_number" | "title_artist")[];
  matchingVariantIds: number[];
};

export type TranslatedNote = { pl: string; en: string; es: string };
