import { toCents, type MediaCondition, type SleeveCondition } from "@/lib/vinyl";
import type { TranslatedNote } from "@/types/lookup";

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
