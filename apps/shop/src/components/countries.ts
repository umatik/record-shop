import { type Locale } from "@/app/messages";

const countryCodes = ["PL", "DE", "CZ", "SK", "AT", "ES", "PT", "FR", "BE", "NL", "IT", "IE", "GB", "SE", "DK", "US", "CA"];

export function countryOptions(lang: Locale) {
  const names = new Intl.DisplayNames(lang, { type: "region" });
  return countryCodes
    .map((code) => ({ value: code, label: names.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}
