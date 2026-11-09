import { Badge, Group, Stack, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import ListRow from "@/components/records/ListRow";
import Price from "@/components/records/Price";
import { buyerName, count, daysSince, formatDate, mediaSrc } from "@/lib/format";
import type { Order } from "@/types/order";
import { ORDER_STATUS } from "./orderStatus";

type OrderRowProps = {
  order: Order;
  /**
   * Wiersz w historii zamówień: zamiast czasu oczekiwania pokazuje status, numer i datę złożenia, bo na liście
   * są zamówienia w każdym stanie.
   */
  history?: boolean;
};

/** Ile opłacone zamówienie czeka na wysyłkę; od 3 dni na czerwono. */
const WaitingTime = ({ paidAt }: { paidAt: string }) => {
  const days = daysSince(paidAt);
  const color = days >= 3 ? "danger.8" : days >= 1 ? "warning.8" : "dimmed";

  return (
    <Text fz="md" fw={700} c={color}>
      {days === 0 ? "opłacone dziś" : `czeka ${count(days, ["dzień", "dni", "dni"])}`}
    </Text>
  );
};

/**
 * Wiersz zamówienia: płyta, kupujący, kwota i czas oczekiwania. Na telefonie kwota ze strzałką schodzi pod
 * opis, żeby nazwisko i tytuł płyty miały całą szerokość; od tabletu stoi w prawej kolumnie.
 */
const OrderRow = ({ order, history = false }: OrderRowProps) => {
  const [first, ...rest] = order.items;
  const record = first ? [first.artists.join(", "), first.productTitle].filter(Boolean).join(" – ") : "";
  const more = rest.length > 0 ? ` i ${count(rest.length, ["płyta", "płyty", "płyt"])} więcej` : "";

  return (
    <ListRow
      href={`/zamowienia/${order.id}`}
      thumb={first?.photoUrl ? mediaSrc(first.photoUrl) : null}
      title={buyerName(order.buyer)}
      subtitle={record + more}
      extra={
        <>
          {history ? (
            <Group gap="xs" mt={2}>
              <Badge color={ORDER_STATUS[order.status].color} variant="light" size="lg" fz="xs" fw={600}>
                {ORDER_STATUS[order.status].label}
              </Badge>
              <Text fz="xs" c="dimmed">
                #{order.id} · {formatDate(order.createdAt)}
              </Text>
            </Group>
          ) : (
            order.status === "paid" && order.paidAt && <WaitingTime paidAt={order.paidAt} />
          )}
          <Group hiddenFrom="sm" justify="space-between" wrap="nowrap">
            <Price cents={order.totalEur} />
            <IconChevronRight size={28} color="var(--mantine-color-dimmed)" aria-hidden="true" />
          </Group>
        </>
      }
      aside={
        <Stack visibleFrom="sm" gap={4} align="flex-end">
          <Price cents={order.totalEur} />
          <IconChevronRight size={28} color="var(--mantine-color-dimmed)" aria-hidden="true" />
        </Stack>
      }
    />
  );
};

export default OrderRow;
