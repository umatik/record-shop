import type { Product, Variant } from "@/types/product";

const eurWhole = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurCents = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "EUR" });
const plural = new Intl.PluralRules("pl-PL");

/** Ceny w API są w eurocentach. Pełne euro bez ",00". */
export const formatEur = (cents: number) => (cents % 100 === 0 ? eurWhole : eurCents).format(cents / 100);

/** Polska odmiana: count(1, ["szkic", "szkice", "szkiców"]) → "1 szkic". */
export function count(n: number, forms: [string, string, string]): string {
  return `${n} ${pluralize(n, forms)}`;
}

/** Sama forma słowa dla liczby: pluralize(2, ["czeka", "czekają", "czeka"]) → "czekają". */
export function pluralize(n: number, [one, few, many]: [string, string, string]): string {
  const form = plural.select(n);
  return form === "one" ? one : form === "few" ? few : many;
}

export const productArtist = (product: Product) => product.attributes.artists?.join(", ") ?? "";

/**
 * Adres zdjęcia do wyświetlenia. API zapisuje wgrane pliki jako ścieżkę względną (`products/photo/...`),
 * serwowaną pod `/uploads`; panel przepisuje `/uploads` do API (next.config.ts). Pełne adresy zostają bez zmian.
 */
export const mediaSrc = (url: string) => (/^https?:\/\//.test(url) || url.startsWith("/") ? url : `/uploads/${url}`);

/** Główne zdjęcie płyty; starsze płyty bez niego pokazują główne zdjęcie któregoś wariantu. */
export function primaryPhoto(product: Product): string | undefined {
  if (product.primaryPhotoUrl) return mediaSrc(product.primaryPhotoUrl);
  const media = product.variants.flatMap((variant) => variant.media).filter((m) => m.type === "photo");
  const photo = media.find((m) => m.isPrimary) ?? media[0];
  return photo && mediaSrc(photo.url);
}

/** Główne zdjęcie wariantu (oznaczone jako główne albo pierwsze). */
export function variantPhoto(variant: Variant): string | undefined {
  const media = variant.media.filter((m) => m.type === "photo");
  const photo = media.find((m) => m.isPrimary) ?? media[0];
  return photo && mediaSrc(photo.url);
}

/** Najniższa cena z wariantów (produkt może mieć kilka tłoczeń w różnych stanach). */
export function lowestPrice(product: Product): number | undefined {
  const prices = product.variants.map((variant) => variant.priceEur);
  return prices.length ? Math.min(...prices) : undefined;
}

/** Czego brakuje szkicowi do publikacji (podpowiedź na pulpicie, nie walidacja). */
export function draftHints(product: Product): string[] {
  const hints: string[] = [];
  if (product.variants.length === 0) hints.push("brak wariantu");
  else if (!primaryPhoto(product)) hints.push("brak zdjęć");
  if (product.type === "vinyl" && !product.attributes.previewLinks?.length) hints.push("brak odsłuchu");
  return hints;
}

/** Imię i nazwisko kupującego albo e-mail, gdy nie podał danych. */
export const buyerName = (buyer: { firstName: string | null; lastName: string | null; email: string }) =>
  [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") || buyer.email;

/** Ile pełnych dni minęło od daty (do „czeka 3 dni”). */
export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const dateTime = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

const dateOnly = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));

/**
 * Strona płyty na Discogs: master release (wszystkie wydania), a bez niego wydanie pierwszego wariantu
 * powiązanego z Discogs.
 */
export function discogsUrl(product: Product): string | undefined {
  const masterId = product.attributes.discogsMasterId;
  if (typeof masterId === "number") return `https://www.discogs.com/master/${masterId}`;
  const releaseId = product.variants
    .map((variant) => variant.attributes.discogsReleaseId)
    .find((id) => typeof id === "number");
  return releaseId === undefined ? undefined : `https://www.discogs.com/release/${releaseId}`;
}
