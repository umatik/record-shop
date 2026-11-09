"use client";

import { Divider, Group, NativeSelect, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCash, IconDisc, IconPackage, IconPencil } from "@tabler/icons-react";
import { useState, useSyncExternalStore } from "react";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOrderSummary } from "@/hooks/useOrders";
import { useProductCount, useReadyDraftCount, useStock } from "@/hooks/useProducts";
import { count, daysSince, formatEur, pluralize } from "@/lib/format";
import type { SalesPeriod } from "@/types/order";
import AttentionSection from "./AttentionSection";
import MetricTile from "./MetricTile";
import SalesChart from "./SalesChart";
import SectionHeading from "./SectionHeading";
import ShippingQueue from "./ShippingQueue";
import StockBar from "./StockBar";

const PERIODS = [
  { value: "30", label: "Ostatnie 30 dni" },
  { value: "7", label: "Ostatnie 7 dni" },
];

const today = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

// Data tylko w przeglądarce: strona jest budowana wcześniej, więc data z serwera byłaby datą builda.
const subscribe = () => () => {};
const todayLabel = () => {
  const label = today.format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Dopisek kafelka „Do wysłania”: jak długo czeka najstarsze opłacone zamówienie. */
const waiting = (toShip: { count: number; oldestPaidAt: string | null }) => {
  if (toShip.count === 0 || !toShip.oldestPaidAt) return { note: "Wszystko wysłane", color: "dimmed" };
  const days = daysSince(toShip.oldestPaidAt);
  if (days === 0) return { note: "Opłacone dziś", color: "dimmed" };
  return {
    note: `Najstarsze czeka ${count(days, ["dzień", "dni", "dni"])}`,
    color: days >= 3 ? "danger.8" : "warning.8",
  };
};

/**
 * Pulpit sklepu (docs/pulpit-claude.md): podsumowanie w kafelkach, kolejka wysyłek, sprawy wymagające uwagi,
 * wykres sprzedaży i stan magazynu. Okres zmienia tylko sprzedaż; reszta to stan na teraz. Każda część ma
 * własne zapytanie, więc błąd jednej nie zasłania pozostałych, a części, do których konto nie ma uprawnień
 * (`orders:manage`, `products:update`), nie są pobierane ani pokazywane.
 */
const Dashboard = () => {
  const [days, setDays] = useState<SalesPeriod>(30);
  const date = useSyncExternalStore(subscribe, todayLabel, () => "");

  const user = useCurrentUser();
  const permissions = user.data?.permissions ?? [];
  const canOrders = permissions.includes("orders:manage");
  const canProducts = permissions.includes("products:update");

  const summary = useOrderSummary(days, canOrders);
  const draftCount = useProductCount("draft", canProducts);
  const readyDrafts = useReadyDraftCount(canProducts);
  const stock = useStock(canProducts);

  const orders = summary.data;
  const wait = orders ? waiting(orders.toShip) : undefined;

  return (
    <Stack gap="xl" maw={640} mx="auto">
      <Group justify="space-between" align="center" gap="md">
        <div>
          <Title order={1}>Pulpit</Title>
          <Text c="dimmed" fz="sm" mt={6} mih="1.55em">
            {date}
          </Text>
        </div>
        {canOrders && (
          <NativeSelect
            aria-label="Okres statystyk sprzedaży"
            data={PERIODS}
            value={String(days)}
            onChange={(event) => setDays(event.currentTarget.value === "7" ? 7 : 30)}
            w={{ base: "100%", sm: "auto" }}
          />
        )}
      </Group>

      {user.isPending && <LoadingState label="Ładowanie pulpitu" />}
      {user.isError && <ErrorState message={user.error.message} onRetry={() => void user.refetch()} />}

      {(canOrders || canProducts) && (
        <SimpleGrid component="section" aria-label="Podsumowanie sklepu" cols={2} spacing="sm">
          {canOrders && (
            <>
              <MetricTile
                label="Do wysłania"
                icon={IconPackage}
                value={orders?.toShip.count}
                note={wait?.note}
                noteColor={wait?.color}
                failed={summary.isError}
                onClick={() => scrollTo("do-wyslania")}
              />
              <MetricTile
                label="Opłacone produkty"
                icon={IconCash}
                value={orders && formatEur(orders.sales.totalEur)}
                note={
                  orders &&
                  `${count(orders.sales.orders, ["zamówienie", "zamówienia", "zamówień"])} · ${orders.sales.days} dni`
                }
                failed={summary.isError}
                onClick={() => scrollTo("sprzedaz")}
              />
              <MetricTile
                label="Sprzedane sztuki"
                icon={IconDisc}
                value={orders?.sales.units}
                note={orders && `W ostatnich ${orders.sales.days} dniach`}
                failed={summary.isError}
                onClick={() => scrollTo("sprzedaz")}
              />
            </>
          )}
          {canProducts && (
            <MetricTile
              label="Szkice do dokończenia"
              icon={IconPencil}
              value={draftCount.data}
              note={
                readyDrafts.data !== undefined &&
                `${count(readyDrafts.data, ["gotowy", "gotowe", "gotowych"])} do publikacji`
              }
              failed={draftCount.isError}
              href="/szkice"
            />
          )}
        </SimpleGrid>
      )}

      {canOrders && summary.isError && (
        <ErrorState message={summary.error.message} onRetry={() => void summary.refetch()} />
      )}
      {canProducts && draftCount.isError && (
        <ErrorState message={draftCount.error.message} onRetry={() => void draftCount.refetch()} />
      )}

      {canOrders && <ShippingQueue />}

      <AttentionSection pending={canOrders ? orders?.pending : undefined} readyDrafts={readyDrafts.data} />

      {canOrders && orders && (
        <Stack component="section" aria-labelledby="sales-title" gap="xs" id="sprzedaz" className="dashboard-anchor">
          <Divider mb="md" />
          <SectionHeading id="sales-title" title="Sprzedaż" aside={`Ostatnie ${orders.sales.days} dni`} />
          <SalesChart sales={orders.sales} />
          {orders.soldWithoutPaidAt > 0 && (
            <Text fz="xs" c="warning.8" role="note">
              {count(orders.soldWithoutPaidAt, ["opłacone zamówienie", "opłacone zamówienia", "opłaconych zamówień"])}{" "}
              {pluralize(orders.soldWithoutPaidAt, ["nie ma", "nie mają", "nie ma"])} zapisanej daty płatności, więc nie{" "}
              {pluralize(orders.soldWithoutPaidAt, ["jest liczone", "są liczone", "jest liczonych"])} w sprzedaży.
            </Text>
          )}
        </Stack>
      )}

      {canProducts && <StockBar stock={stock.data} error={stock.error} onRetry={() => void stock.refetch()} />}
    </Stack>
  );
};

export default Dashboard;
