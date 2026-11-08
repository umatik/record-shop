"use client";

import { Alert, Button, Group, NumberInput, Paper, SimpleGrid, Stack, Text, Textarea, Title } from "@mantine/core";
import { IconArrowRight, IconLanguage, IconMinus, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "@/lib/api";

/** Skala Goldmine; API przyjmuje kody, opisy są dla człowieka. */
const MEDIA_GRADES = [
  { code: "M", label: "M", description: "Nowa, nigdy nie grana." },
  { code: "NM", label: "NM", description: "Prawie jak nowa, bez śladów użycia." },
  { code: "VG+", label: "VG+", description: "Drobne ślady, gra czysto." },
  { code: "VG", label: "VG", description: "Widoczne ślady, lekkie trzaski w cichych miejscach." },
  { code: "G+", label: "G+", description: "Wyraźne trzaski, ale gra bez przeskoków." },
  { code: "G", label: "G", description: "Mocno zużyta, głośne trzaski." },
  { code: "F", label: "F", description: "Ledwo grywalna." },
  { code: "P", label: "P", description: "Uszkodzona, na części albo do kolekcji." },
] as const;

const SLEEVE_GRADES = [
  ...MEDIA_GRADES,
  { code: "generic", label: "Okładka firmowa", description: "Okładka firmowa wytwórni albo zwykła koperta." },
  { code: "no_cover", label: "Bez okładki", description: "Płyta bez okładki." },
] as const;

export type MediaCondition = (typeof MEDIA_GRADES)[number]["code"];
export type SleeveCondition = (typeof SLEEVE_GRADES)[number]["code"];

export interface VariantInput {
  mediaCondition: MediaCondition;
  sleeveCondition: SleeveCondition;
  /** Eurocenty, jak w API. */
  priceEur: number;
  quantity: number;
  conditionNote?: { pl: string; en: string; es: string };
}

/** Stan formularza kroku 4. Trzyma go kreator, więc po cofnięciu i powrocie nic nie znika. */
export interface ConditionForm {
  media: MediaCondition | null;
  sleeve: SleeveCondition | null;
  /** Euro, tak jak wpisane (puste pole to ""). */
  price: number | string;
  quantity: number;
  note: string;
  translation: { pl: string; en: string; es: string } | null;
}

export const emptyConditionForm: ConditionForm = {
  media: null,
  sleeve: null,
  price: "",
  quantity: 1,
  note: "",
  translation: null,
};

function conditionErrors({ media, sleeve, price, note, translation }: ConditionForm) {
  const priceCents = typeof price === "number" ? Math.round(price * 100) : NaN;
  return {
    media: media ? null : "Wybierz stan płyty.",
    sleeve: sleeve ? null : "Wybierz stan okładki.",
    price: priceCents > 0 ? null : "Wpisz cenę.",
    note: note.trim() && translation?.pl !== note.trim() ? "Przetłumacz notatkę albo ją usuń." : null,
  };
}

/** Wariant gotowy do zapisu albo `null`, gdy formularz jest niekompletny. */
export function toVariant(form: ConditionForm): VariantInput | null {
  if (Object.values(conditionErrors(form)).some(Boolean) || !form.media || !form.sleeve) return null;
  return {
    mediaCondition: form.media,
    sleeveCondition: form.sleeve,
    priceEur: Math.round(Number(form.price) * 100),
    quantity: form.quantity,
    ...(form.note.trim() && form.translation ? { conditionNote: form.translation } : {}),
  };
}

function GradePicker<T extends string>({
  title,
  grades,
  value,
  onChange,
  error,
}: {
  title: string;
  grades: readonly { code: T; label: string; description: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
}) {
  const selected = grades.find((grade) => grade.code === value);
  return (
    <Stack gap="xs">
      <Title order={2} fz={24}>
        {title}
      </Title>
      {/* Oceny Goldmine po cztery w rzędzie, dłuższe opcje okładki po dwie. */}
      <SimpleGrid cols={4} spacing="xs">
        {grades.slice(0, 8).map((grade) => (
          <Button
            key={grade.code}
            size="lg"
            px={4}
            variant={grade.code === value ? "filled" : "default"}
            onClick={() => onChange(grade.code)}
            aria-pressed={grade.code === value}
          >
            {grade.label}
          </Button>
        ))}
      </SimpleGrid>
      {grades.length > 8 && (
        <SimpleGrid cols={2} spacing="xs">
          {grades.slice(8).map((grade) => (
            <Button
              key={grade.code}
              size="lg"
              px={4}
              variant={grade.code === value ? "filled" : "default"}
              onClick={() => onChange(grade.code)}
              aria-pressed={grade.code === value}
            >
              {grade.label}
            </Button>
          ))}
        </SimpleGrid>
      )}
      {selected && <Text fz="lg">{selected.description}</Text>}
      {error && (
        <Text c="red" fz="md">
          {error}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Krok 4: stan płyty i okładki w skali Goldmine, cena w euro, ilość i notatka o stanie.
 * Notatkę wpisuje się po polsku; tłumaczenie na EN i ES pokazujemy do sprawdzenia i poprawki, nic nie zapisujemy w ciemno.
 */
export function ConditionStep({
  value,
  onChange,
  onNext,
}: {
  value: ConditionForm;
  onChange: (patch: Partial<ConditionForm>) => void;
  onNext: () => void;
}) {
  const { media, sleeve, price, quantity, note, translation } = value;
  const setMedia = (media: MediaCondition) => onChange({ media });
  const setSleeve = (sleeve: SleeveCondition) => onChange({ sleeve });
  const setPrice = (price: number | string) => onChange({ price });
  const setQuantity = (quantity: number) => onChange({ quantity });
  const setNote = (note: string) => onChange({ note });
  const setTranslation = (translation: ConditionForm["translation"]) => onChange({ translation });
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const errors = conditionErrors(value);

  async function translate() {
    setTranslating(true);
    setTranslateError(null);
    try {
      const { conditionNote } = await api<{ conditionNote: { pl: string; en: string; es: string } }>(
        "/products/lookup/condition-note",
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: note.trim() }) },
      );
      setTranslation({ ...conditionNote, pl: note.trim() });
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "Nie udało się przetłumaczyć.");
      // Pola tłumaczenia do wpisania ręcznie, żeby brak Claude nie blokował dodania płyty.
      setTranslation({ pl: note.trim(), en: translation?.en ?? "", es: translation?.es ?? "" });
    } finally {
      setTranslating(false);
    }
  }

  function next() {
    if (!toVariant(value)) {
      setShowErrors(true);
      return;
    }
    onNext();
  }

  return (
    <Stack gap="xl">
      <Title order={1} fz={32}>
        Stan i cena
      </Title>

      <GradePicker title="Stan płyty" grades={MEDIA_GRADES} value={media} onChange={setMedia} error={showErrors ? errors.media : null} />
      <GradePicker title="Stan okładki" grades={SLEEVE_GRADES} value={sleeve} onChange={setSleeve} error={showErrors ? errors.sleeve : null} />

      <Stack gap={6}>
        {/* Nagłówek i pole w jednej linii; dopisek o złotówkach pod spodem. */}
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Text component="label" htmlFor="variant-price" fz={24} fw={800} lh="60px">
            Cena
          </Text>
          <NumberInput
            id="variant-price"
            size="xl"
            style={{ flex: 1 }}
            value={price}
            onChange={setPrice}
            min={0}
            suffix=" €"
            placeholder="0 €"
            hideControls
            // Klawiatura numeryczna z przecinkiem; kropka z klawiatur Androida też działa jako separator.
            inputMode="decimal"
            decimalScale={2}
            decimalSeparator=","
            allowedDecimalSeparators={[",", "."]}
            allowNegative={false}
            // Dopisek pod polem, wyrównany do jego lewej krawędzi.
            description="W euro. Cenę w złotych policzy sklep według kursu NBP."
            inputWrapperOrder={["input", "description", "error"]}
            styles={{ description: { fontSize: "var(--mantine-font-size-md)", marginTop: 6 } }}
            error={showErrors ? errors.price : null}
          />
        </Group>
      </Stack>

      <Stack gap="xs">
        <Title order={2} fz={24}>
          Ilość
        </Title>
        <Group gap="md" wrap="nowrap">
          <Button size="xl" variant="default" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Mniej">
            <IconMinus size={26} />
          </Button>
          <Text fz={32} fw={700} w={64} ta="center">
            {quantity}
          </Text>
          <Button size="xl" variant="default" onClick={() => setQuantity(quantity + 1)} aria-label="Więcej">
            <IconPlus size={26} />
          </Button>
          <Text c="dimmed" fz="lg">
            {quantity === 1 ? "sztuka" : quantity < 5 ? "sztuki" : "sztuk"}
          </Text>
        </Group>
      </Stack>

      <Stack gap="xs">
        <Title order={2} fz={24}>
          Notatka o stanie
        </Title>
        <Textarea
          size="lg"
          autosize
          minRows={3}
          maxLength={1000}
          placeholder="Lekki trzask na stronie B, okładka z przetarciem"
          description="Po polsku. Klient zobaczy ją po angielsku albo hiszpańsku."
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
        {note.trim() && translation?.pl !== note.trim() && (
          <Button size="lg" variant="light" leftSection={<IconLanguage size={24} />} loading={translating} onClick={translate}>
            {translation ? "Przetłumacz ponownie" : "Przetłumacz (EN, ES)"}
          </Button>
        )}
        {translateError && (
          <Alert color="red" variant="light" fz="md">
            {translateError} Wpisz tłumaczenie poniżej sam albo usuń notatkę.
          </Alert>
        )}
        {translation && translation.pl === note.trim() && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text fw={700} fz="lg">
                Sprawdź tłumaczenie
              </Text>
              <Textarea
                size="lg"
                autosize
                label="Angielski"
                value={translation.en}
                onChange={(event) => setTranslation({ ...translation, en: event.currentTarget.value })}
              />
              <Textarea
                size="lg"
                autosize
                label="Hiszpański"
                value={translation.es}
                onChange={(event) => setTranslation({ ...translation, es: event.currentTarget.value })}
              />
            </Stack>
          </Paper>
        )}
        {showErrors && errors.note && (
          <Text c="red" fz="md">
            {errors.note}
          </Text>
        )}
      </Stack>

      <Button size="xl" fullWidth rightSection={<IconArrowRight size={26} />} onClick={next}>
        Dalej: zdjęcia
      </Button>
    </Stack>
  );
}
