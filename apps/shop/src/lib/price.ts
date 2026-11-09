import type { Locale } from "@/app/messages";

// API podaje ceny w eurocentach i groszach.
export type Price = { priceEur: number; pricePln?: number | null };

const euro = {
  en: new Intl.NumberFormat("en", { style: "currency", currency: "EUR" }),
  es: new Intl.NumberFormat("es", { style: "currency", currency: "EUR" }),
  pl: new Intl.NumberFormat("pl", { style: "currency", currency: "EUR" }),
};
const zloty = new Intl.NumberFormat("pl", { style: "currency", currency: "PLN" });

export function formatPrice(lang: Locale, { priceEur, pricePln }: Price) {
  const eur = euro[lang].format(priceEur / 100);
  return lang === "pl" && pricePln != null ? `${zloty.format(pricePln / 100)} (${eur})` : eur;
}
