"use client";

import { Button, Collapse, Stack } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { useState } from "react";
import OrderRow from "@/components/orders/OrderRow";
import RowList from "@/components/records/RowList";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useOrderList } from "@/hooks/useOrders";
import { count, daysSince, formatEur, pluralize } from "@/lib/format";
import type { OrderSummary } from "@/types/order";
import AttentionRow from "./AttentionRow";

type PendingOrdersProps = {
  pending: OrderSummary["pending"];
};

/** Od kiedy czeka najstarsze zamówienie (liczone od złożenia). */
const oldest = (createdAt: string | null) => {
  if (!createdAt) return "";
  const days = daysSince(createdAt);
  return days === 0 ? " · najstarsze z dziś" : ` · najstarsze od ${count(days, ["dnia", "dni", "dni"])}`;
};

/**
 * Zamówienia czekające na płatność: wiersz z liczbą i wartością, który rozwija ich listę. Każde zamówienie
 * prowadzi do swojego widoku. Lista pobiera się dopiero po rozwinięciu.
 */
const PendingOrders = ({ pending }: PendingOrdersProps) => {
  const [expanded, setExpanded] = useState(false);
  const list = useOrderList({ status: "pending", sort: "oldest" }, expanded);
  const title = `${count(pending.count, ["zamówienie", "zamówienia", "zamówień"])} ${pluralize(pending.count, ["czeka", "czekają", "czeka"])} na płatność`;

  return (
    <>
      <AttentionRow
        icon={IconClock}
        color="warning"
        title={title}
        description={`Łącznie ${formatEur(pending.totalEur)}${oldest(pending.oldestCreatedAt)}`}
        expanded={expanded}
        controls="pending-orders"
        onToggle={() => setExpanded((value) => !value)}
      />
      <Collapse expanded={expanded} id="pending-orders">
        <Stack gap="xs" pb="sm">
          {list.isPending && <LoadingState label="Ładowanie zamówień czekających na płatność" height={120} />}
          {list.isError && <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />}
          <RowList
            items={list.orders}
            getKey={(order) => order.id}
            renderItem={(order) => <OrderRow order={order} />}
            label="Zamówienia czekające na płatność"
          />
          {list.hasNextPage && (
            <Button
              variant="subtle"
              mx="auto"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              Pokaż więcej
            </Button>
          )}
        </Stack>
      </Collapse>
    </>
  );
};

export default PendingOrders;
