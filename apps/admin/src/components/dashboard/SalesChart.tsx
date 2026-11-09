"use client";

import { Box, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { count, formatEur, pluralize } from "@/lib/format";
import { axisMax, salesBuckets } from "@/lib/sales";
import type { OrderSummary } from "@/types/order";

type SalesChartProps = {
  sales: OrderSummary["sales"];
};

/** Wysokość pola słupków w px (bez podpisów pod nimi). */
const PLOT_HEIGHT = 126;

/**
 * Wykres sprzedaży: jedna seria słupków, oś czasu i oś w euro. Słupek to przycisk: dotknięcie albo fokus
 * pokazuje jego zakres i kwotę pod wykresem (na telefonie nie ma najechania myszą). Bez sprzedaży słupki
 * mają zerową wysokość, a pod wykresem jest o tym informacja.
 */
const SalesChart = ({ sales }: SalesChartProps) => {
  const [selected, setSelected] = useState<{ days: number; index: number } | null>(null);
  const buckets = salesBuckets(sales.daily);
  const max = axisMax(buckets);
  // Zaznaczenie dotyczy słupków jednego okresu; po zmianie okresu przestaje obowiązywać.
  const picked = selected?.days === sales.days ? buckets[selected.index] : undefined;

  const summary =
    sales.orders === 0
      ? "Brak opłaconych zamówień w tym okresie"
      : `Łącznie ${count(sales.units, ["sztuka", "sztuki", "sztuk"])} w ${sales.orders} ${pluralize(sales.orders, ["zamówieniu", "zamówieniach", "zamówieniach"])}`;

  return (
    <Stack gap="xs">
      <Group align="baseline" gap="sm">
        <Text fz="xxl" fw={800} className="tabular">
          {formatEur(sales.totalEur)}
        </Text>
        <Text fz="xs" c="dimmed">
          wartość opłaconych produktów
        </Text>
      </Group>

      <Group
        role="group"
        aria-label={`Wartość opłaconych produktów: ${buckets.map((bucket) => `${bucket.title} ${formatEur(bucket.totalEur)}`).join(", ")}. Razem ${formatEur(sales.totalEur)}.`}
        wrap="nowrap"
        align="stretch"
        gap="sm"
      >
        <Stack justify="space-between" h={PLOT_HEIGHT} gap={0} aria-hidden="true" style={{ flexShrink: 0 }}>
          {[max, max / 2, 0].map((value) => (
            <Text key={value} fz="xs" c="dimmed" ta="right" lh={1} className="tabular">
              {formatEur(value)}
            </Text>
          ))}
        </Stack>

        <Box className="sales-plot" style={{ flex: 1, minWidth: 0 }}>
          {buckets.map((bucket, index) => {
            const isPicked = picked === bucket;
            return (
              <Stack key={bucket.title} gap={6} align="center" style={{ flex: 1, minWidth: 0 }}>
                <Box
                  h={PLOT_HEIGHT}
                  w="100%"
                  style={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}
                >
                  <Tooltip label={`${bucket.title} · ${formatEur(bucket.totalEur)}`} withArrow>
                    <UnstyledButton
                      className="sales-bar"
                      aria-label={`${bucket.title}: ${formatEur(bucket.totalEur)}`}
                      aria-pressed={isPicked}
                      h={Math.round((bucket.totalEur / max) * PLOT_HEIGHT)}
                      onClick={() => setSelected(isPicked ? null : { days: sales.days, index })}
                    />
                  </Tooltip>
                </Box>
                <Text fz="xs" c="dimmed" ta="center" lh={1.2} aria-hidden="true">
                  {bucket.label}
                </Text>
              </Stack>
            );
          })}
        </Box>
      </Group>

      <Text fz="xs" c="dimmed" ta="right" aria-live="polite" className="tabular">
        {picked ? `${picked.title} · ${formatEur(picked.totalEur)}` : summary}
      </Text>
    </Stack>
  );
};

export default SalesChart;
