"use client";

import { Alert, Loader, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/hooks/queryKeys";
import { readLabelDraft, saveLabelDraft, type LabelDraft } from "@/services/labelDrafts.services";
import { useRef, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useReleaseDraft, useReleaseSearch } from "@/hooks/useLookup";
import type {
  LabelLookupResult,
  LabelReading,
  ProductMatch,
  ReleaseCandidate,
  ReleaseSearchQuery,
} from "@/types/lookup";
import { emptyConditionForm, toVariant, type ConditionForm } from "./condition";
import ConditionStep from "./ConditionStep";
import { detailsFromReading, mergeDraft, type FromLabel, type RecordDetails } from "./details";
import DetailsStep from "./DetailsStep";
import PhotosStep from "./PhotosStep";
import PhotoStep from "./PhotoStep";
import PickStep from "./PickStep";
import SummaryStep from "./SummaryStep";
import WizardHeader from "./WizardHeader";

/** Kolejność ustalona w notatkach panelu: zdjęcie → wydanie → dane → stan i cena → zdjęcia → podsumowanie. */
type Step = "photo" | "pick" | "details" | "condition" | "photos" | "summary";
const STEP_NUMBER: Record<Step, number> = { photo: 1, pick: 2, details: 3, condition: 4, photos: 5, summary: 6 };
const STEP_COUNT = 6;

/**
 * Kreator dodawania płyty. Dane wszystkich kroków trzyma tutaj, a kroki tylko je pokazują i zmieniają,
 * więc „Wstecz” niczego nie kasuje, a „Dalej” w nagłówku wraca do kroków, które już były wypełnione.
 */
const AddRecordWizard = ({ newId, initial }: { newId: string; initial?: { draft: LabelDraft; files: File[] } }) => {
  const initialResult = initial?.draft.result;
  const initialStep = initialResult?.kind === "found" ? "pick" : "details";
  const client = useQueryClient();
  const draftId = useRef(initial?.draft.id);
  const saving = useRef(false);
  // Odwiedzone kroki i pozycja w nich, jak historia w przeglądarce.
  const [path, setPath] = useState<Step[]>(initialResult ? ["photo", initialStep] : ["photo"]);
  const [index, setIndex] = useState(initialResult ? 1 : 0);
  const step = path[index] ?? "photo";

  // Krok 1: zdjęcia labelu jako pliki (podgląd) i jako identyfikatory w API (pierwsze stanie się zdjęciem głównym).
  const [labelPhotos, setLabelPhotos] = useState<File[]>(initial?.files ?? []);
  const [photoUploadIds, setPhotoUploadIds] = useState<string[]>(initial?.draft.photos.map((photo) => photo.id) ?? []);
  // Zdjęcia zmienione po ostatnim odczycie: trzeba je odczytać ponownie, zanim pójdziemy dalej.
  const [lookedUpPhotos, setLookedUpPhotos] = useState<File[]>(initialResult ? initial!.files : []);
  // Krok 2.
  const [reading, setReading] = useState<LabelReading | null>(initialResult?.reading ?? null);
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>(
    initialResult?.kind === "found" ? initialResult.candidates : [],
  );
  const releaseSearch = useReleaseSearch();
  const releaseDraft = useReleaseDraft();
  const loadingRelease = releaseDraft.isPending;
  // Krok 3.
  const [details, setDetails] = useState<RecordDetails | null>(
    initialResult?.kind === "failed" ? detailsFromReading(initialResult.reading) : null,
  );
  const [fromLabel, setFromLabel] = useState<FromLabel>({});
  const [existingProducts, setExistingProducts] = useState<ProductMatch[]>([]);
  const [destination, setDestination] = useState<number | "new" | null>(null);
  const vinylMatches = existingProducts.filter((match) => match.type === "vinyl");
  const exactMatches = vinylMatches.filter((match) => match.matchedBy.includes("discogs_release"));
  const choices = exactMatches.length ? exactMatches : vinylMatches;
  const selectedDestination = destination ?? choices[0]?.productId ?? "new";
  const target = choices.find((match) => match.productId === selectedDestination) ?? null;
  const [notice, setNotice] = useState<string | null>(initialResult?.kind === "failed" ? initialResult.message : null);
  // Kroki 4 i 5.
  const [condition, setCondition] = useState<ConditionForm>(emptyConditionForm);
  const [extraPhotos, setExtraPhotos] = useState<File[]>([]);

  const [saved, setSaved] = useState(false);

  const savePhotos = useMutation({
    mutationFn: async (photos: File[]) => {
      const id = draftId.current ?? crypto.randomUUID?.() ?? newId;
      draftId.current = id;
      return saveLabelDraft(id, photos, photoUploadIds);
    },
    onSuccess: (draft, photos) => {
      setLabelPhotos(photos);
      setPhotoUploadIds(draft.photos.map((photo) => photo.id));
      setPath(["photo"]);
      setIndex(0);
      // Nowe zdjęcia to (zwykle) inna płyta: wszystko z poprzedniego odczytu trzeba zebrać od nowa.
      setReading(null);
      setLookedUpPhotos([]);
      setCandidates([]);
      setDetails(null);
      setFromLabel({});
      setExistingProducts([]);
      setDestination(null);
      setNotice(null);
      const url = new URL(window.location.href);
      if (photos.length) url.searchParams.set("szkic", draft.id);
      else {
        url.searchParams.delete("szkic");
        draftId.current = undefined;
      }
      window.history.replaceState(null, "", url);
      void client.invalidateQueries({ queryKey: productKeys.all });
    },
    onSettled: () => {
      saving.current = false;
    },
  });

  const lookup = useMutation({
    mutationFn: () => readLabelDraft(draftId.current!, photoUploadIds),
    onSuccess: (result) => {
      onRead(result, labelPhotos);
      void client.invalidateQueries({ queryKey: productKeys.all });
    },
  });

  const variant = toVariant(condition);
  const photosChanged =
    labelPhotos.length !== lookedUpPhotos.length || labelPhotos.some((file, i) => file !== lookedUpPhotos[i]);

  /** Czy krok ma już dane, żeby do niego przejść przyciskiem „Dalej” w nagłówku. */
  const ready: Record<Step, boolean> = {
    photo: true,
    pick: reading !== null && !photosChanged,
    details: details !== null && !photosChanged,
    condition: details !== null && !photosChanged,
    photos: details !== null && variant !== null && !photosChanged,
    summary: details !== null && variant !== null && !photosChanged,
  };

  const show = (i: number) => {
    setIndex(i);
    releaseSearch.reset();
    releaseDraft.reset();
    window.scrollTo(0, 0);
  };

  /** Przejście do kroku przyciskiem w treści: jeśli to ten sam krok co dalej w historii, zachowujemy dalsze kroki. */
  const go = (next: Step) => {
    if (path[index + 1] !== next) setPath([...path.slice(0, index + 1), next]);
    show(index + 1);
  };

  const canGoBack = index > 0 && !saved && !loadingRelease && !savePhotos.isPending && !lookup.isPending;
  const nextInPath = path[index + 1];
  const canGoForward =
    nextInPath !== undefined &&
    ready[nextInPath] &&
    !saved &&
    !loadingRelease &&
    !savePhotos.isPending &&
    !lookup.isPending;

  function reset() {
    // Pełne otwarcie kreatora nadaje kolejnej płycie osobny identyfikator.
    window.location.replace("/dodaj");
  }

  function onRead(result: LabelLookupResult, photos: File[]) {
    setLookedUpPhotos(photos);
    setReading(result.reading);
    if (result.kind === "found") {
      setPhotoUploadIds(result.photoUploadIds);
      setCandidates(result.candidates);
      // Nowy odczyt to (zwykle) inna płyta: dane z kroku 3 trzeba wybrać od nowa. Stan i zdjęcia zostają.
      setDetails(null);
      setNotice(null);
      go("pick");
    } else {
      // Claude albo Discogs zawiodły: wpisanie ręczne z tym, co udało się odczytać.
      setPhotoUploadIds(result.photoUploadIds);
      setCandidates([]);
      setDetails(detailsFromReading(result.reading));
      setFromLabel({});
      setExistingProducts([]);
      setNotice(`${result.message} Wpisz dane ręcznie, zdjęcie zostanie dołączone do płyty.`);
      setPath(["photo", "details"]);
      show(1);
    }
  }

  /** Wyszukanie po poprawionym odczycie: tylko Discogs. Poprawki zostają w odczycie, więc trafią też do kroku 3. */
  async function onSearch(query: ReleaseSearchQuery) {
    try {
      setCandidates(await releaseSearch.mutateAsync(query));
      setReading(
        (current: LabelReading | null) =>
          current && {
            ...current,
            artists: query.artist
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean),
            title: query.title.trim() || null,
            label: query.label.trim() || null,
            catalogNumber: query.catalogNumber.trim() || null,
          },
      );
      // Inne wyniki mogą oznaczać inną płytę: dane z kroku 3 trzeba wybrać od nowa.
      setDetails(null);
    } catch {
      // Błąd pokazuje `releaseSearch.error` nad krokiem.
    }
  }

  function onPick(candidate: ReleaseCandidate) {
    releaseDraft.mutate(candidate.releaseId, {
      onSuccess: (result) => {
        const merged = mergeDraft(result.draft, reading);
        setDetails(merged.details);
        setFromLabel(merged.fromLabel);
        setExistingProducts(result.existingProducts);
        setDestination(null);
        go("details");
      },
    });
  }

  function onManual() {
    setDetails(detailsFromReading(reading));
    setFromLabel({});
    setExistingProducts([]);
    go("details");
  }

  const error = savePhotos.error ?? lookup.error ?? releaseSearch.error ?? releaseDraft.error;

  return (
    <Stack gap="lg" maw={640} mx="auto">
      <WizardHeader
        step={STEP_NUMBER[step]}
        stepCount={STEP_COUNT}
        onBack={canGoBack ? () => show(index - 1) : undefined}
        onForward={canGoForward ? () => show(index + 1) : undefined}
      />

      {error && <ErrorState message={error.message} />}

      {step === "photo" && (
        <PhotoStep
          photos={labelPhotos}
          saving={savePhotos.isPending}
          reading={lookup.isPending}
          onPhotosChange={(photos) => {
            if (saving.current || lookup.isPending) return;
            saving.current = true;
            savePhotos.mutate(photos);
          }}
          onRead={() => lookup.mutate()}
        />
      )}

      {step === "pick" && reading && !loadingRelease && (
        <PickStep reading={reading} candidates={candidates} onPick={onPick} onManual={onManual} onSearch={onSearch} />
      )}

      {loadingRelease && (
        <Stack role="status" align="center" py="xl" gap="md">
          <Loader size="lg" aria-hidden="true" />
          <Text fz="lg">Pobieranie danych wydania z Discogs…</Text>
        </Stack>
      )}

      {step === "details" && details && (
        <>
          {notice && (
            <Alert color="yellow" variant="light" fz="md">
              {notice}
            </Alert>
          )}
          <DetailsStep
            details={details}
            onChange={(patch) => setDetails((current) => (current ? { ...current, ...patch } : current))}
            fromLabel={fromLabel}
            existingProducts={choices}
            target={target}
            destination={selectedDestination}
            onDestination={setDestination}
            onNext={() => go("condition")}
          />
        </>
      )}

      {step === "condition" && (
        <ConditionStep
          form={condition}
          onChange={(patch) => setCondition((current) => ({ ...current, ...patch }))}
          onNext={() => go("photos")}
        />
      )}

      {step === "photos" && (
        <PhotosStep
          labelPhotos={labelPhotos}
          extraPhotos={extraPhotos}
          onExtraPhotosChange={setExtraPhotos}
          onNext={() => go("summary")}
        />
      )}

      {step === "summary" && details && variant && (
        <SummaryStep
          target={target}
          details={target ? { ...details, artists: target.artists.join(", "), title: target.title } : details}
          variant={variant}
          photoUploadIds={photoUploadIds}
          labelPhotos={labelPhotos}
          extraPhotos={extraPhotos}
          onSaved={(id) => {
            setSaved(true);
            window.history.replaceState(null, "", `/produkty/${id}`);
          }}
          onAddAnother={reset}
        />
      )}
    </Stack>
  );
};

export default AddRecordWizard;
