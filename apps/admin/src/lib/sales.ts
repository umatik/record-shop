import type { SalesDay } from "@/types/order";

/** Słupek wykresu sprzedaży: dzień albo kilka kolejnych dni. */
export type SalesBucket = {
  /** Krótki opis pod słupkiem, np. „pon.” albo „11–17 paź”. */
  label: string;
  /** Pełny opis do podpowiedzi i dla czytnika ekranu. */
  title: string;
  /** Eurocenty. */
  totalEur: number;
};

const WEEK = 7;

// Daty z API to dni kalendarzowe sklepu (`YYYY-MM-DD`); liczymy je w UTC, żeby strefa przeglądarki ich nie przesuwała.
const toDate = (date: string) => new Date(`${date}T00:00:00Z`);
const weekday = new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("pl-PL", { day: "numeric", timeZone: "UTC" });

const range = (from: string, to: string) => {
  const [start, end] = [toDate(from), toDate(to)];
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${sameMonth ? dayOnly.format(start) : dayMonth.format(start)}–${dayMonth.format(end)}`;
};

/**
 * Słupki wykresu z dziennej sprzedaży. Do tygodnia: słupek na dzień. Dłuższy okres: kolejne tygodnie od
 * początku okresu, a reszta dni dochodzi do ostatniego słupka (30 dni = 7 + 7 + 7 + 9). Każdy dzień trafia
 * do dokładnie jednego słupka, więc suma słupków równa się sumie okresu.
 */
export function salesBuckets(daily: SalesDay[]): SalesBucket[] {
  if (daily.length <= WEEK) {
    return daily.map((day) => ({
      label: weekday.format(toDate(day.date)),
      title: fullDay.format(toDate(day.date)),
      totalEur: day.totalEur,
    }));
  }

  const bucketCount = Math.floor(daily.length / WEEK);

  return Array.from({ length: bucketCount }, (_, index) => {
    const days = daily.slice(index * WEEK, index === bucketCount - 1 ? undefined : (index + 1) * WEEK);
    const label = range(days[0]!.date, days.at(-1)!.date);
    return { label, title: label, totalEur: days.reduce((sum, day) => sum + day.totalEur, 0) };
  });
}

/** Górna granica osi: najbliższa „okrągła” kwota (1, 2 albo 5 × 10ⁿ euro) nie mniejsza od największego słupka. */
export function axisMax(buckets: SalesBucket[]): number {
  const highest = Math.max(...buckets.map((bucket) => bucket.totalEur), 0) / 100;
  if (highest <= 10) return 1000;

  const magnitude = 10 ** Math.floor(Math.log10(highest));
  const step = [1, 2, 5, 10].find((multiplier) => multiplier * magnitude >= highest) ?? 10;
  return step * magnitude * 100;
}
