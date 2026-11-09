"use client";

import { Alert, Loader, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/hooks/queryKeys";
import { saveLabelDraft, type LabelDraft, type WizardDraftState } from "@/services/labelDrafts.services";
import { useRef, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useLabelLookup, useReleaseDraft, useReleaseSearch } from "@/hooks/useLookup";
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

/** Kolejność ustalona w notatkach panelu: zdjęcie → wydanie → płyta → wariant (tłoczenie, stan, cena) → zdjęcia → podsumowanie. */
type Step = "photo" | "pick" | "details" | "condition" | "photos" | "summary";
const STEP_NUMBER: Record<Step, number> = { photo: 1, pick: 2, details: 3, condition: 4, photos: 5, summary: 6 };
const STEP_COUNT = 6;

/**
 * Kreator dodawania płyty. Dane wszystkich kroków trzyma tutaj, a kroki tylko je pokazują i zmieniają,
 * więc „Wstecz” niczego nie kasuje, a „Dalej” w nagłówku wraca do kroków, które już były wypełnione.
 */
const AddRecordWizard = ({ newId, initial }: { newId: string; initial?: { draft: LabelDraft; files: File[] } }) => {
  // Szkic bez danych płyty (zapisany przed odczytem) wraca na krok ze zdjęciem.
  const resumed = initial?.draft.state?.details ? initial.draft.state : null;
  const client = useQueryClient();
  // Szkic powstaje dopiero przy kroku „Sprawdź dane”; wcześniej zdjęcia z odczytu same wygasają w API.
  const draftId = useRef(initial?.draft.id);
  // Odwiedzone kroki i pozycja w nich, jak historia w przeglądarce.
  const resumedPath: Step[] = resumed?.candidates.length ? ["photo", "pick", "details"] : ["photo", "details"];
  const [path, setPath] = useState<Step[]>(resumed ? resumedPath : ["photo"]);
  const [index, setIndex] = useState(resumed ? resumedPath.length - 1 : 0);
  const step = path[index] ?? "photo";

  // Krok 1: zdjęcia labelu jako pliki (podgląd) i jako identyfikatory w API (pierwsze stanie się zdjęciem głównym).
  const [labelPhotos, setLabelPhotos] = useState<File[]>(initial?.files ?? []);
  const [photoUploadIds, setPhotoUploadIds] = useState<string[]>(initial?.draft.photos.map((photo) => photo.id) ?? []);
  // Zdjęcia zmienione po ostatnim odczycie: trzeba je odczytać ponownie, zanim pójdziemy dalej.
  const [lookedUpPhotos, setLookedUpPhotos] = useState<File[]>(resumed ? (initial?.files ?? []) : []);
  // Krok 2.
  const [reading, setReading] = useState<LabelReading | null>(resumed?.reading ?? null);
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>(resumed?.candidates ?? []);
  const releaseSearch = useReleaseSearch();
  const releaseDraft = useReleaseDraft();
  const reread = useLabelLookup();
  const loadingRelease = releaseDraft.isPending;
  // Krok 3.
  const [details, setDetails] = useState<RecordDetails | null>(resumed?.details ?? null);
  const [fromLabel, setFromLabel] = useState<FromLabel>(resumed?.fromLabel ?? {});
  const [existingProducts, setExistingProducts] = useState<ProductMatch[]>(resumed?.existingProducts ?? []);
  const [destination, setDestination] = useState<number | "new" | null>(null);
  const vinylMatches = existingProducts.filter((match) => match.type === "vinyl");
  const exactMatches = vinylMatches.filter((match) => match.matchedBy.includes("discogs_release"));
  const choices = exactMatches.length ? exactMatches : vinylMatches;
  const selectedDestination = destination ?? choices[0]?.productId ?? "new";
  const target = choices.find((match) => match.productId === selectedDestination) ?? null;
  const [notice, setNotice] = useState<string | null>(resumed?.notice ?? null);
  // Kroki 4 i 5.
  const [condition, setCondition] = useState<ConditionForm>(emptyConditionForm);
  const [extraPhotos, setExtraPhotos] = useState<File[]>([]);

  const [saved, setSaved] = useState(false);

  const saveDraft = useMutation({
    mutationFn: ({ ids, state }: { ids: string[]; state: WizardDraftState }) => {
      const id = draftId.current ?? crypto.randomUUID?.() ?? newId;
      draftId.current = id;
      return saveLabelDraft(id, ids, state);
    },
    onSuccess: (draft) => {
      const url = new URL(window.location.href);
      url.searchParams.set("szkic", draft.id);
      window.history.replaceState(null, "", url);
      void client.invalidateQueries({ queryKey: productKeys.all });
    },
  });

  /**
   * Zapis szkicu przy wejściu na krok „Sprawdź dane” i przy wyjściu z niego dalej. Nie blokuje kreatora:
   * błąd zapisu widać nad krokiem, a płytę i tak da się zapisać.
   */
  function persist(changes: Partial<WizardDraftState> & { details: RecordDetails }, ids = photoUploadIds) {
    if (ids.length === 0) return;
    saveDraft.mutate({ ids, state: { reading, candidates, fromLabel, existingProducts, notice, ...changes } });
  }

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

  const canGoBack = index > 0 && !saved && !loadingRelease;
  const nextInPath = path[index + 1];
  const canGoForward = nextInPath !== undefined && ready[nextInPath] && !saved && !loadingRelease;

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
      const manual = detailsFromReading(result.reading);
      const message = `${result.message} Wpisz dane ręcznie, zdjęcie zostanie dołączone do płyty.`;
      setPhotoUploadIds(result.photoUploadIds);
      setCandidates([]);
      setDetails(manual);
      setFromLabel({});
      setExistingProducts([]);
      setNotice(message);
      setPath(["photo", "details"]);
      show(1);
      persist(
        {
          reading: result.reading,
          candidates: [],
          details: manual,
          fromLabel: {},
          existingProducts: [],
          notice: message,
        },
        result.photoUploadIds,
      );
    }
  }

  /** Ponowny odczyt labelu na kroku wyboru: zostajemy na tym kroku z nowym odczytem i kandydatami. */
  function onReread() {
    reread.mutate(labelPhotos, {
      onSuccess: (result) => {
        if (result.kind === "failed") {
          onRead(result, labelPhotos);
          return;
        }
        setLookedUpPhotos(labelPhotos);
        setReading(result.reading);
        setPhotoUploadIds(result.photoUploadIds);
        setCandidates(result.candidates);
        setDetails(null);
        setNotice(null);
      },
    });
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
        persist({ ...merged, existingProducts: result.existingProducts });
      },
    });
  }

  function onManual() {
    const manual = detailsFromReading(reading);
    setDetails(manual);
    setFromLabel({});
    setExistingProducts([]);
    go("details");
    persist({ details: manual, fromLabel: {}, existingProducts: [] });
  }

  const error = reread.error ?? releaseSearch.error ?? releaseDraft.error;

  return (
    <Stack gap="lg" maw={640} mx="auto">
      <WizardHeader
        step={STEP_NUMBER[step]}
        stepCount={STEP_COUNT}
        onBack={canGoBack ? () => show(index - 1) : undefined}
        onForward={canGoForward ? () => show(index + 1) : undefined}
      />

      {error && <ErrorState message={error.message} />}

      {step === "photo" && <PhotoStep photos={labelPhotos} onPhotosChange={setLabelPhotos} onRead={onRead} />}

      {step === "pick" && reading && !loadingRelease && (
        <PickStep
          reading={reading}
          candidates={candidates}
          onPick={onPick}
          onManual={onManual}
          onSearch={onSearch}
          onReread={onReread}
          rereading={reread.isPending}
        />
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
            onNext={() => {
              go("condition");
              persist({ details });
            }}
          />
          {saveDraft.isError && <ErrorState message={`Nie udało się zapisać szkicu: ${saveDraft.error.message}`} />}
        </>
      )}

      {step === "condition" && details && (
        <ConditionStep
          details={details}
          onDetailsChange={(patch) => setDetails((current) => (current ? { ...current, ...patch } : current))}
          fromLabel={fromLabel}
          form={condition}
          onChange={(patch) => setCondition((current) => ({ ...current, ...patch }))}
          onNext={() => {
            go("photos");
            // Tłoczenie poprawiane w kroku wariantu też trafia do szkicu.
            persist({ details });
          }}
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
