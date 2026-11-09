"use client";

import { Divider, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import RowList from "@/components/records/RowList";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import PageTitle from "@/components/ui/PageTitle";
import { useOrders } from "@/hooks/useOrders";
import { count } from "@/lib/format";
import type { OrderListFilters } from "@/types/order";
import OrderRow from "./OrderRow";

type OrderSectionProps = {
  id: string;
  title: string;
  filters: OrderListFilters;
  level: 1 | 2;
  /** Co pokazać, gdy lista jest pusta; bez tego sekcja znika. */
  empty?: ReactNode;
  /** Linia oddzielająca od poprzedniej sekcji (znika razem z sekcją). */
  divider?: boolean;
};

/** Sekcja pulpitu z listą zamówień jednego statusu. */
const OrderSection = ({ id, title, filters, level, empty, divider }: OrderSectionProps) => {
  const orders = useOrders(filters);
  const total = orders.data?.pagination.total;

  if (total === 0 && !empty) return null;

  return (
    <Stack component="section" aria-labelledby={id} gap="xs">
      {divider && <Divider mb="md" />}
      <PageTitle
        id={id}
        order={level}
        title={title}
        aside={total ? count(total, ["zamówienie", "zamówienia", "zamówień"]) : undefined}
      />
      {orders.isPending && <LoadingState label={`Ładowanie: ${title}`} />}
      {orders.isError && <ErrorState message={orders.error.message} />}
      {total === 0 && empty}
      {orders.data && (
        <RowList
          items={orders.data.orders}
          getKey={(order) => order.id}
          renderItem={(order) => <OrderRow order={order} />}
        />
      )}
      {orders.data && total !== undefined && total > orders.data.orders.length && (
        <p className="sr-only">
          Pokazano {orders.data.orders.length} z {total}.
        </p>
      )}
    </Stack>
  );
};

export default OrderSection;
