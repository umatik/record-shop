import type { CreateProductInput } from "@/types/product";
import type { VariantInput } from "./condition";
import type { RecordDetails } from "./details";

/** Klucz z wartością albo nic, gdy wartość jest pusta (API odrzuca puste pola opcjonalne). */
const optional = <K extends string, V>(key: K, value: V | undefined | "") =>
  value === undefined || value === "" ? {} : ({ [key]: value } as Record<K, V>);

/** Ciało `POST /products` z danych kreatora: produkt z jednym wariantem, zdjęcia labelu przez `photoUploadIds`. */
export function buildProductInput(
  details: RecordDetails,
  variant: VariantInput,
  photoUploadIds: string[],
): CreateProductInput {
  const artists = details.artists
    .split(",")
    .map((artist) => artist.trim())
    .filter(Boolean);
  const year = Number.parseInt(details.year, 10);

  return {
    type: "vinyl",
    title: details.title.trim(),
    ...(details.discogs?.description ? { description: details.discogs.description } : {}),
    attributes: {
      artists,
      tracklist: details.discogs?.tracklist ?? [],
      previewLinks: details.discogs?.previewLinks ?? [],
      ...optional("discogsMasterId", details.discogs?.discogsMasterId),
      ...(details.discogs?.discogsArtistIds?.length ? { discogsArtistIds: details.discogs.discogsArtistIds } : {}),
    },
    variants: [
      {
        priceEur: variant.priceEur,
        quantity: variant.quantity,
        ...(photoUploadIds.length ? { photoUploadIds } : {}),
        attributes: {
          format: details.format,
          ...optional("speed", details.speed ? Number(details.speed) : undefined),
          ...optional("year", Number.isFinite(year) ? year : undefined),
          ...optional("label", details.label.trim()),
          ...optional("catalogNumber", details.catalogNumber.trim()),
          ...optional("country", details.discogs?.country),
          ...optional("pressing", details.discogs?.pressing),
          ...optional("discogsReleaseId", details.discogsReleaseId),
          mediaCondition: variant.mediaCondition,
          sleeveCondition: variant.sleeveCondition,
          ...optional("conditionNote", variant.conditionNote),
        },
      },
    ],
  };
}
