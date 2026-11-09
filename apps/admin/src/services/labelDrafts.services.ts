import type { LabelLookupResult } from "@/types/lookup";
import { mediaSrc } from "@/lib/format";
import { ApiError, request } from "./http";

export type LabelDraft = {
  id: string;
  photos: { id: string; path: string; contentType: string }[];
  result: LabelLookupResult | null;
};

export async function getLabelDrafts() {
  const { drafts } = await request<{ drafts: LabelDraft[] }>("/products/lookup/drafts");
  return drafts;
}

export async function loadLabelDraft(id: string) {
  const draft = await request<LabelDraft>(`/products/lookup/drafts/${encodeURIComponent(id)}`);
  const files = await Promise.all(
    draft.photos.map(async ({ id, path, contentType }) => {
      const response = await fetch(mediaSrc(path));
      if (!response.ok) throw new Error("Nie udało się pobrać zdjęcia szkicu.");
      return new File([await response.blob()], id, { type: contentType });
    }),
  );
  return { draft, files };
}

function photoForm(photos: File[], previous: string[]) {
  const form = new FormData();
  photos.forEach((photo) => form.append("images", photo));
  form.append("previous", previous.join());
  return form;
}

/** 409: zdjęcia szkicu zmieniono w innej karcie albo na innym urządzeniu. */
function explainConflict(error: unknown): never {
  if (error instanceof ApiError && error.status === 409) {
    throw new ApiError("Ten szkic zmienił się w innym oknie. Otwórz go ponownie z listy szkiców.", 409);
  }
  throw error;
}

export function saveLabelDraft(id: string, photos: File[], previous: string[]) {
  return request<LabelDraft>(`/products/lookup/drafts/${id}`, {
    method: "PUT",
    form: photoForm(photos, previous),
  }).catch(explainConflict);
}

export function readLabelDraft(id: string, previous: string[]) {
  return request<LabelLookupResult>(`/products/lookup/drafts/${id}/read`, {
    method: "POST",
    json: { previous: previous.join() },
  }).catch(explainConflict);
}
