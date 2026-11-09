import { Stack } from "@mantine/core";
import { IconMoodSmile } from "@tabler/icons-react";
import EmptyState from "@/components/ui/EmptyState";
import OrderSection from "./OrderSection";

/**
 * Pulpit: to, co wymaga reakcji. Na górze opłacone zamówienia do wysłania, od najstarszych.
 * „Czeka na płatność” pokazuje się tylko, gdy coś w nim jest.
 */
const OrdersDashboard = () => (
  <Stack gap="xl" maw={640} mx="auto">
    <OrderSection
      id="to-ship-title"
      level={1}
      title="Do wysłania"
      filters={{ status: "paid", sort: "oldest" }}
      empty={
        <EmptyState
          icon={<IconMoodSmile size={48} color="var(--mantine-color-green-7)" aria-hidden="true" />}
          title="Nic do wysłania"
          description="Wszystkie opłacone zamówienia są wysłane."
        />
      }
    />
    <OrderSection
      divider
      id="pending-title"
      level={2}
      title="Czeka na płatność"
      filters={{ status: "pending", sort: "newest" }}
    />
  </Stack>
);

export default OrdersDashboard;
