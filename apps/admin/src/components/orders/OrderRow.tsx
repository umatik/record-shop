import { Stack, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import ListRow from "@/components/records/ListRow";
import Price from "@/components/records/Price";
import { buyerName, count, daysSince, mediaSrc } from "@/lib/format";
import type { Order } from "@/types/order";

type OrderRowProps = {
  order: Order;
};

/** Ile opłacone zamówienie czeka na wysyłkę; od 3 dni na czerwono. */
const WaitingTime = ({ paidAt }: { paidAt: string }) => {
  const days = daysSince(paidAt);
  const color = days >= 3 ? "red.8" : days >= 1 ? "yellow.8" : "dimmed";

  return (
    <Text fz="lg" fw={700} c={color}>
      {days === 0 ? "opłacone dziś" : `czeka ${count(days, ["dzień", "dni", "dni"])}`}
    </Text>
  );
};

/** Wiersz zamówienia: płyta, kupujący, kwota i czas oczekiwania. */
const OrderRow = ({ order }: OrderRowProps) => {
  const [first, ...rest] = order.items;
  const record = first ? [first.artists.join(", "), first.productTitle].filter(Boolean).join(" – ") : "";
  const more = rest.length > 0 ? ` i ${count(rest.length, ["płyta", "płyty", "płyt"])} więcej` : "";

  return (
    <ListRow
      href={`/zamowienia/${order.id}`}
      thumb={first?.photoUrl ? mediaSrc(first.photoUrl) : null}
      title={buyerName(order.buyer)}
      subtitle={record + more}
      extra={order.paidAt ? <WaitingTime paidAt={order.paidAt} /> : undefined}
      aside={
        <Stack gap={4} align="flex-end">
          <Price cents={order.totalEur} />
          <IconChevronRight size={28} aria-hidden="true" />
        </Stack>
      }
    />
  );
};

export default OrderRow;
