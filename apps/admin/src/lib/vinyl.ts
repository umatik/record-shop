// Słownik płyt winylowych używany w kreatorze i w widoku produktu.

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

const SLEEVE_LABEL: Record<string, string> = { generic: "okładka firmowa", no_cover: "bez okładki" };

/** Stan okładki do zdania, np. „okładka VG+” albo „okładka firmowa”. */
export const describeSleeve = (sleeve: string) => SLEEVE_LABEL[sleeve] ?? `okładka ${sleeve}`;

/** Format i stan z atrybutów wariantu, np. „LP · NM · okładka VG+”. */
export function describeVariant(attributes: Record<string, unknown>): string {
  const format = attributes.format as string | undefined;
  const media = attributes.mediaCondition as string | undefined;
  const sleeve = attributes.sleeveCondition as string | undefined;
  return [format, media, sleeve && describeSleeve(sleeve)].filter(Boolean).join(" · ");
}

/**
 * Cena z pola w eurocentach. Mantine `NumberInput` z przecinkiem dziesiętnym oddaje ułamki jako tekst
 * (np. „18,50”), a pełne kwoty jako liczbę, więc trzeba przyjąć obie postacie. `NaN`, gdy pole jest puste.
 */
export function toCents(price: number | string): number {
  const euros = typeof price === "number" ? price : Number(price.replace(/\s|€/g, "").replace(",", "."));
  return price === "" ? NaN : Math.round(euros * 100);
}
