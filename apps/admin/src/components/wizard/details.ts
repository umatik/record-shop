import type { LabelReading, ReleaseDraft } from "@/types/lookup";
import type { VinylFormat } from "@/types/product";

/** Dane płyty w formularzu kreatora: z Discogs, z odczytu labelu albo wpisane ręcznie. */
export type RecordDetails = {
  artists: string;
  title: string;
  label: string;
  catalogNumber: string;
  year: string;
  format: VinylFormat | "";
  speed: "33" | "45" | "";
  discogsReleaseId?: number;
  tracklistCount: number;
  previewLinksCount: number;
  /** Dane z Discogs, których formularz nie pokazuje, ale zapisujemy je z płytą. */
  discogs?: {
    description: string | null;
    tracklist: ReleaseDraft["product"]["attributes"]["tracklist"];
    previewLinks: string[];
    /** Do wykrywania tej samej płyty w innym wydaniu. */
    discogsMasterId?: number;
    discogsArtistIds?: number[];
    country?: string;
    pressing?: "reissue";
  };
};

export type DetailsField = Exclude<
  keyof RecordDetails,
  "discogsReleaseId" | "tracklistCount" | "previewLinksCount" | "discogs"
>;

/** Pola, których Discogs nie podał, a odczytał je Claude z labelu (np. prędkość). */
export type FromLabel = Partial<Record<DetailsField, true>>;

/** Łączy szkic z Discogs z odczytem labelu: puste pola z Discogs uzupełnia odczyt i zaznacza to. */
export function mergeDraft(
  draft: ReleaseDraft,
  reading: LabelReading | null,
): { details: RecordDetails; fromLabel: FromLabel } {
  const v = draft.variant.attributes;
  const fromLabel: FromLabel = {};
  const pick = <T>(field: DetailsField, discogs: T | undefined, label: T | null | undefined): T | undefined => {
    if (discogs !== undefined && discogs !== null && discogs !== "") return discogs;
    if (label !== undefined && label !== null && label !== "") {
      fromLabel[field] = true;
      return label;
    }
    return undefined;
  };
  const speed = pick("speed", v.speed, reading?.speed === 33 || reading?.speed === 45 ? reading.speed : null);

  return {
    details: {
      artists: draft.product.attributes.artists.join(", "),
      title: draft.product.title,
      label: pick("label", v.label, reading?.label) ?? "",
      catalogNumber: pick("catalogNumber", v.catalogNumber, reading?.catalogNumber) ?? "",
      year: String(pick("year", v.year, reading?.year) ?? ""),
      format: pick("format", v.format, reading?.format) ?? "",
      speed: speed ? (String(speed) as "33" | "45") : "",
      discogsReleaseId: v.discogsReleaseId,
      tracklistCount: draft.product.attributes.tracklist.length,
      previewLinksCount: draft.product.attributes.previewLinks.length,
      discogs: {
        description: draft.product.description,
        tracklist: draft.product.attributes.tracklist,
        previewLinks: draft.product.attributes.previewLinks,
        ...(draft.product.attributes.discogsMasterId && { discogsMasterId: draft.product.attributes.discogsMasterId }),
        ...(draft.product.attributes.discogsArtistIds?.length && {
          discogsArtistIds: draft.product.attributes.discogsArtistIds,
        }),
        ...(v.country ? { country: v.country } : {}),
        ...(v.pressing ? { pressing: v.pressing } : {}),
      },
    },
    fromLabel,
  };
}

/** Formularz ręczny wypełniony tym, co Claude odczytał z labelu. */
export function detailsFromReading(reading: LabelReading | null): RecordDetails {
  return {
    artists: reading?.artists.join(", ") ?? "",
    title: reading?.title ?? "",
    label: reading?.label ?? "",
    catalogNumber: reading?.catalogNumber ?? "",
    year: reading?.year ? String(reading.year) : "",
    format: reading?.format ?? "",
    speed: reading?.speed === 33 || reading?.speed === 45 ? (String(reading.speed) as "33" | "45") : "",
    tracklistCount: 0,
    previewLinksCount: 0,
  };
}
