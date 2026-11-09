import { useMutation } from "@tanstack/react-query";
import { getReleaseDraft, lookupLabelPhotos, searchReleases, translateConditionNote } from "@/services/lookup.services";

// Pomocnicze wywołania kreatora. Każde jest akcją użytkownika (i część kosztuje), więc to mutacje,
// a nie zapytania odświeżane w tle.

export function useLabelLookup() {
  return useMutation({ mutationFn: lookupLabelPhotos });
}

export function useReleaseSearch() {
  return useMutation({ mutationFn: searchReleases });
}

export function useReleaseDraft() {
  return useMutation({ mutationFn: getReleaseDraft });
}

export function useTranslateNote() {
  return useMutation({ mutationFn: translateConditionNote });
}
