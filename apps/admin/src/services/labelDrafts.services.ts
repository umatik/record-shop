import type { FromLabel, RecordDetails } from "@/components/wizard/details";
import type { LabelReading, ProductMatch, ReleaseCandidate } from "@/types/lookup";
import { mediaSrc } from "@/lib/format";
import { request } from "./http";

/** Stan kreatora zapisany przy kroku „Sprawdź dane”; po powrocie kreator otwiera się na tym kroku. */
export type WizardDraftState = {
  reading: LabelReading | null;
  candidates: ReleaseCandidate[];
  details: RecordDetails;
  fromLabel: FromLabel;
  existingProducts: ProductMatch[];
  notice: string | null;
};

export type LabelDraft = {
  id: string;
  photos: { id: string; path: string; contentType: string }[];
  state: WizardDraftState | null;
};

export async function getLabelDrafts() {
  const { drafts } = await request<{ drafts: LabelDraft[] }>("/products/lookup/drafts");
  return drafts;
}

/** Szkic razem ze zdjęciami labelu jako plikami, tak jak kreator trzyma je po zrobieniu zdjęcia. */
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

/** Zapis szkicu: zdjęcia z odczytu labelu (w kolejności) przechodzą do szkicu razem ze stanem kreatora. */
export function saveLabelDraft(id: string, photoUploadIds: string[], state: WizardDraftState) {
  return request<LabelDraft>(`/products/lookup/drafts/${encodeURIComponent(id)}`, {
    method: "PUT",
    json: { photoUploadIds, state },
  });
}

export async function deleteLabelDraft(id: string) {
  await request(`/products/lookup/drafts/${encodeURIComponent(id)}`, { method: "DELETE" });
}
