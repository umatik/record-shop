"use client";

import { Alert, Button, Loader, Progress, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { LabelReading, ProductMatch, ReleaseCandidate, ReleaseDraft } from "@/lib/types";
import { ConditionStep, emptyConditionForm, toVariant, type ConditionForm } from "./ConditionStep";
import { DetailsStep, detailsFromReading, mergeDraft, type FromLabel, type RecordDetails } from "./DetailsStep";
import { PhotoStep, type PhotoResult } from "./PhotoStep";
import { PhotosStep } from "./PhotosStep";
import { PickStep, type SearchQuery } from "./PickStep";
import { SummaryStep } from "./SummaryStep";

/** Kolejność ustalona w notatkach panelu: zdjęcie → wydanie → dane → stan i cena → zdjęcia → podsumowanie. */
type Step = "photo" | "pick" | "details" | "condition" | "photos" | "summary";
const STEP_NUMBER: Record<Step, number> = { photo: 1, pick: 2, details: 3, condition: 4, photos: 5, summary: 6 };
const STEP_COUNT = 6;

/**
 * Kreator dodawania płyty. Dane wszystkich kroków trzyma tutaj, a kroki tylko je pokazują i zmieniają,
 * więc „Wstecz” niczego nie kasuje, a „Dalej” w nagłówku wraca do kroków, które już były wypełnione.
 */
export function AddRecordWizard() {
  // Odwiedzone kroki i pozycja w nich, jak historia w przeglądarce.
  const [path, setPath] = useState<Step[]>(["photo"]);
  const [index, setIndex] = useState(0);
  const step = path[index] ?? "photo";

  // Krok 1: zdjęcia labelu jako pliki (podgląd) i jako identyfikatory w API (pierwsze stanie się zdjęciem głównym).
  const [labelPhotos, setLabelPhotos] = useState<File[]>([]);
  const [photoUploadIds, setPhotoUploadIds] = useState<string[]>([]);
  // Zdjęcia zmienione po ostatnim odczycie: trzeba je odczytać ponownie, zanim pójdziemy dalej.
  const [lookedUpPhotos, setLookedUpPhotos] = useState<File[]>([]);
  // Krok 2.
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [loadingRelease, setLoadingRelease] = useState(false);
  // Krok 3.
  const [details, setDetails] = useState<RecordDetails | null>(null);
  const [fromLabel, setFromLabel] = useState<FromLabel>({});
  const [existingProducts, setExistingProducts] = useState<ProductMatch[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // Kroki 4 i 5.
  const [condition, setCondition] = useState<ConditionForm>(emptyConditionForm);
  const [extraPhotos, setExtraPhotos] = useState<File[]>([]);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
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
    setPath(["photo"]);
    setIndex(0);
    setLabelPhotos([]);
    setPhotoUploadIds([]);
    setLookedUpPhotos([]);
    setReading(null);
    setCandidates([]);
    setDetails(null);
    setFromLabel({});
    setExistingProducts([]);
    setNotice(null);
    setCondition(emptyConditionForm);
    setExtraPhotos([]);
    setSaved(false);
    setError(null);
    window.scrollTo(0, 0);
  }

  function onPhoto(result: PhotoResult) {
    setLookedUpPhotos(result.files);
    setReading(result.kind === "found" ? result.lookup.reading : result.reading);
    if (result.kind === "found") {
      setPhotoUploadIds(result.lookup.photoUploadIds);
      setCandidates(result.lookup.candidates);
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
  async function onSearch(query: SearchQuery) {
    setError(null);
    const params = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value.trim()) as [string, string][],
    );
    try {
      const result = await api<{ candidates: ReleaseCandidate[] }>(`/products/lookup?${params}`);
      setCandidates(result.candidates);
      setReading((current) =>
        current && {
          ...current,
          artists: query.artist.split(",").map((a) => a.trim()).filter(Boolean),
          title: query.title.trim() || null,
          label: query.label.trim() || null,
          catalogNumber: query.catalogNumber.trim() || null,
        },
      );
      // Inne wyniki mogą oznaczać inną płytę: dane z kroku 3 trzeba wybrać od nowa.
      setDetails(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wyszukać na Discogs.");
    }
  }

  async function onPick(candidate: ReleaseCandidate) {
    setLoadingRelease(true);
    setError(null);
    try {
      const result = await api<{ draft: ReleaseDraft; existingProducts: ProductMatch[] }>(
        `/products/lookup/releases/${candidate.releaseId}`,
      );
      const merged = mergeDraft(result.draft, reading);
      setDetails(merged.details);
      setFromLabel(merged.fromLabel);
      setExistingProducts(result.existingProducts);
      go("details");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać wydania z Discogs.");
    } finally {
      setLoadingRelease(false);
    }
  }

  function onManual() {
    setDetails(detailsFromReading(reading));
    setFromLabel({});
    setExistingProducts([]);
    go("details");
  }

  return (
    <Stack gap="lg" maw={640} mx="auto">
      <Stack gap={6}>
        {/* Trzy kolumny o równych bokach, żeby licznik kroków był zawsze na środku. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", minHeight: 44 }}>
          <div>
          {canGoBack && (
            <Button variant="subtle" size="lg" px={0} leftSection={<IconArrowLeft size={24} />} onClick={() => show(index - 1)}>
              Wstecz
            </Button>
          )}
          </div>
          <Text fz="lg" c="dimmed" ta="center">
            Krok {STEP_NUMBER[step]} z {STEP_COUNT}
          </Text>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {canGoForward && (
            <Button variant="subtle" size="lg" px={0} rightSection={<IconArrowRight size={24} />} onClick={() => show(index + 1)}>
              Dalej
            </Button>
          )}
          </div>
        </div>
        <Progress value={(STEP_NUMBER[step] / STEP_COUNT) * 100} size="md" radius="xl" />
      </Stack>

      {error && (
        <Alert color="red" variant="light" fz="md">
          {error}
        </Alert>
      )}

      {step === "photo" && <PhotoStep value={labelPhotos} onChange={setLabelPhotos} onDone={onPhoto} />}

      {step === "pick" && reading && !loadingRelease && (
        <PickStep reading={reading} candidates={candidates} onPick={onPick} onManual={onManual} onSearch={onSearch} />
      )}

      {loadingRelease && (
        <Stack align="center" py="xl" gap="md">
          <Loader size="lg" />
          <Text fz="lg">Pobieram dane wydania z Discogs…</Text>
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
            value={details}
            onChange={(patch) => setDetails((current) => (current ? { ...current, ...patch } : current))}
            fromLabel={fromLabel}
            existingProducts={existingProducts}
            onNext={() => go("condition")}
          />
        </>
      )}

      {step === "condition" && (
        <ConditionStep
          value={condition}
          onChange={(patch) => setCondition((current) => ({ ...current, ...patch }))}
          onNext={() => go("photos")}
        />
      )}

      {step === "photos" && (
        <PhotosStep labelPhotos={labelPhotos} value={extraPhotos} onChange={setExtraPhotos} onNext={() => go("summary")} />
      )}

      {step === "summary" && details && variant && (
        <SummaryStep
          details={details}
          variant={variant}
          photoUploadIds={photoUploadIds}
          labelPhotos={labelPhotos}
          extraPhotos={extraPhotos}
          onSaved={() => setSaved(true)}
          onAddAnother={reset}
        />
      )}
    </Stack>
  );
}
