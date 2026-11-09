import type { TranslatedNote } from "@/types/lookup";

/** Skala Goldmine; API przyjmuje kody, opisy są dla człowieka. */
export type Grade<T extends string> = { code: T; label: string; description: string };

export const MEDIA_GRADES = [
  { code: "M", label: "M", description: "Nowa, nigdy nie grana." },
  { code: "NM", label: "NM", description: "Prawie jak nowa, bez śladów użycia." },
  { code: "VG+", label: "VG+", description: "Drobne ślady, gra czysto." },
  { code: "VG", label: "VG", description: "Widoczne ślady, lekkie trzaski w cichych miejscach." },
  { code: "G+", label: "G+", description: "Wyraźne trzaski, ale gra bez przeskoków." },
  { code: "G", label: "G", description: "Mocno zużyta, głośne trzaski." },
  { code: "F", label: "F", description: "Ledwo grywalna." },
  { code: "P", label: "P", description: "Uszkodzona, na części albo do kolekcji." },
] as const;

export const SLEEVE_GRADES = [
  ...MEDIA_GRADES,
  { code: "generic", label: "Okładka firmowa", description: "Okładka firmowa wytwórni albo zwykła koperta." },
  { code: "no_cover", label: "Bez okładki", description: "Płyta bez okładki." },
] as const;

export type MediaCondition = (typeof MEDIA_GRADES)[number]["code"];
export type SleeveCondition = (typeof SLEEVE_GRADES)[number]["code"];

export type VariantInput = {
  mediaCondition: MediaCondition;
  sleeveCondition: SleeveCondition;
  /** Eurocenty, jak w API. */
  priceEur: number;
  quantity: number;
  conditionNote?: TranslatedNote;
};

/** Stan formularza kroku 4. Trzyma go kreator, więc po cofnięciu i powrocie nic nie znika. */
export type ConditionForm = {
  media: MediaCondition | null;
  sleeve: SleeveCondition | null;
  /** Euro, tak jak wpisane (puste pole to ""). */
  price: number | string;
  quantity: number;
  note: string;
  translation: TranslatedNote | null;
};

export const emptyConditionForm: ConditionForm = {
  media: null,
  sleeve: null,
  price: "",
  quantity: 1,
  note: "",
  translation: null,
};

/**
 * Cena z pola w eurocentach. Mantine `NumberInput` z przecinkiem dziesiętnym oddaje ułamki jako tekst
 * (np. „18,50”), a pełne kwoty jako liczbę, więc trzeba przyjąć obie postacie. `NaN`, gdy pole jest puste.
 */
export function toCents(price: number | string): number {
  const euros = typeof price === "number" ? price : Number(price.replace(/\s|€/g, "").replace(",", "."));
  return price === "" ? NaN : Math.round(euros * 100);
}

/** Komunikaty dla brakujących pól; `null` przy poprawnym polu. */
export function conditionErrors({ media, sleeve, price, note, translation }: ConditionForm) {
  const priceCents = toCents(price);
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
    priceEur: toCents(form.price),
    quantity: form.quantity,
    ...(form.note.trim() && form.translation ? { conditionNote: form.translation } : {}),
  };
}
