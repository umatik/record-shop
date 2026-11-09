import { Text } from "@mantine/core";
import { formatDateTime } from "@/lib/format";
import type { Order } from "@/types/order";

type OrderTimelineProps = {
  order: Order;
};

/** Daty zmian statusu jako lista definicji. */
const OrderTimeline = ({ order }: OrderTimelineProps) => {
  const events = [
    { label: "Złożone", at: order.createdAt },
    { label: "Opłacone", at: order.paidAt },
    { label: "Wysłane", at: order.shippedAt },
    { label: "Anulowane", at: order.cancelledAt },
  ].filter((event): event is { label: string; at: string } => Boolean(event.at));

  return (
    <dl style={{ margin: 0 }}>
      {events.map((event) => (
        <Text key={event.label} c="dimmed" fz="sm" component="div">
          <dt style={{ display: "inline" }}>{event.label} </dt>
          <dd style={{ display: "inline", margin: 0 }}>{formatDateTime(event.at)}</dd>
        </Text>
      ))}
    </dl>
  );
};

export default OrderTimeline;
