"use client";

import { Button, Stack } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconMoodSmile } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import OrderRow from "@/components/orders/OrderRow";
import RowList from "@/components/records/RowList";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useOrderList } from "@/hooks/useOrders";
import { count } from "@/lib/format";
import SectionHeading from "./SectionHeading";

/** Tyle zamówień widać od razu; resztę odsłania „Pokaż wszystkie”. */
const PREVIEW = 2;

const ORDERS: [string, string, string] = ["zamówienie", "zamówienia", "zamówień"];

/**
 * Kolejka wysyłek: opłacone zamówienia od najdłużej czekających od zapłaty. Po rozwinięciu dociąga kolejne
 * strony z API, aż pokaże wszystkie, więc lista nie kończy się po cichu na pierwszej stronie.
 */
const ShippingQueue = () => {
  const [expanded, setExpanded] = useState(false);
  const queue = useOrderList({ status: "paid", sort: "paid_oldest" });
  const { hasNextPage, isFetchingNextPage, fetchNextPage, total } = queue;

  useEffect(() => {
    if (expanded && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [expanded, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const shown = expanded ? queue.orders : queue.orders.slice(0, PREVIEW);

  return (
    <Stack component="section" aria-labelledby="to-ship-title" gap="xs" className="dashboard-anchor" id="do-wyslania">
      <SectionHeading id="to-ship-title" title="Do wysłania" aside={total ? count(total, ORDERS) : undefined} />

      {queue.isPending && <LoadingState label="Ładowanie zamówień do wysłania" />}
      {queue.isError && <ErrorState message={queue.error.message} onRetry={() => void queue.refetch()} />}
      {total === 0 && (
        <EmptyState
          icon={<IconMoodSmile size={48} color="var(--mantine-color-success-7)" aria-hidden="true" />}
          title="Nic do wysłania"
          description="Wszystkie opłacone zamówienia są wysłane."
        />
      )}

      {shown.length > 0 && (
        <RowList items={shown} getKey={(order) => order.id} renderItem={(order) => <OrderRow order={order} />} />
      )}

      {total !== undefined && total > PREVIEW && (
        <Button
          variant="subtle"
          size="sm"
          px="xs"
          mx="auto"
          maw="100%"
          aria-expanded={expanded}
          loading={expanded && isFetchingNextPage}
          rightSection={
            expanded ? <IconArrowUp size={18} aria-hidden="true" /> : <IconArrowDown size={18} aria-hidden="true" />
          }
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Pokaż mniej" : `Pokaż wszystkie ${count(total, ORDERS)}`}
        </Button>
      )}
    </Stack>
  );
};

export default ShippingQueue;
