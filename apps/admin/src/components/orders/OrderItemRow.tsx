import { Group, Stack, Text } from "@mantine/core";
import RecordThumb from "@/components/records/RecordThumb";
import Price from "@/components/records/Price";
import { mediaSrc } from "@/lib/format";
import { describeVariant } from "@/lib/vinyl";
import type { OrderItem } from "@/types/order";

type OrderItemRowProps = {
  item: OrderItem;
};

/** Pozycja zamówienia: płyta, stan i cena (razy ilość). */
const OrderItemRow = ({ item }: OrderItemRowProps) => (
  <Group wrap="nowrap" gap="md" py="md" align="flex-start">
    <RecordThumb src={item.photoUrl ? mediaSrc(item.photoUrl) : null} />
    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
      <Text fw={700} fz="xl" lh={1.25} lineClamp={2}>
        {item.artists.join(", ") || item.productTitle}
      </Text>
      <Text c="dimmed" fz="lg" lineClamp={2}>
        {item.productTitle}
      </Text>
      <Text fz="md">{describeVariant(item.variantAttributes)}</Text>
    </Stack>
    <Stack gap={0} align="flex-end">
      <Price cents={item.priceEur * item.quantity} />
      {item.quantity > 1 && <Text c="dimmed">{item.quantity} szt.</Text>}
    </Stack>
  </Group>
);

export default OrderItemRow;
