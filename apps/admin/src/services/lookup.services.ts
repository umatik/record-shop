import type {
  LabelLookupResult,
  LabelReading,
  ProductMatch,
  ReleaseCandidate,
  ReleaseDraft,
  ReleaseSearchQuery,
  TranslatedNote,
} from "@/types/lookup";
import { ApiError, request, toQuery } from "./http";

/**
 * Zdjęcia labelu → odczyt przez Claude → kandydaci z Discogs. Awaria integracji (502/503) nie jest błędem
 * kreatora: zdjęcia są zapisane, więc zwracamy `failed` z ich identyfikatorami do wpisania ręcznego.
 */
export async function lookupLabelPhotos(photos: File[]): Promise<LabelLookupResult> {
  const form = new FormData();
  photos.forEach((photo) => form.append("images", photo));

  try {
    const result = await request<{ reading: LabelReading; candidates: ReleaseCandidate[]; photoUploadIds: string[] }>(
      "/products/lookup/photo",
      { method: "POST", form },
    );
    return { kind: "found", ...result };
  } catch (error) {
    const photoUploadIds = error instanceof ApiError ? error.body.photoUploadIds : undefined;
    if (error instanceof ApiError && Array.isArray(photoUploadIds) && photoUploadIds.length > 0) {
      return {
        kind: "failed",
        message: error.message,
        reading: (error.body.reading as LabelReading | undefined) ?? null,
        photoUploadIds: photoUploadIds as string[],
      };
    }
    throw error;
  }
}

/** Wyszukiwanie wydań po poprawionym odczycie: tylko Discogs, bez ponownego odczytu zdjęcia. */
export async function searchReleases(query: ReleaseSearchQuery) {
  const { candidates } = await request<{ candidates: ReleaseCandidate[] }>(`/products/lookup?${toQuery(query)}`);
  return candidates;
}

export function getReleaseDraft(releaseId: number) {
  return request<{ draft: ReleaseDraft; existingProducts: ProductMatch[] }>(`/products/lookup/releases/${releaseId}`);
}

export async function translateConditionNote(text: string) {
  const { conditionNote } = await request<{ conditionNote: TranslatedNote }>("/products/lookup/condition-note", {
    method: "POST",
    json: { text },
  });
  return conditionNote;
}
