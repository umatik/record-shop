"use client";

import { Alert, Badge, Button, Group, Stack, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import RowList from "@/components/records/RowList";
import Price from "@/components/records/Price";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useOrder } from "@/hooks/useOrders";
import BuyerDetails from "./BuyerDetails";
import OrderActions from "./OrderActions";
import OrderItemRow from "./OrderItemRow";
import { ORDER_STATUS } from "./orderStatus";
import OrderTimeline from "./OrderTimeline";

type OrderDetailProps = {
  orderId: number;
};

/** Widok zamówienia: kto kupił, co kupił, za ile i co dalej. */
const OrderDetail = ({ orderId }: OrderDetailProps) => {
  const { data: order, isPending, isError, error } = useOrder(orderId);

  return (
    <Stack component="article" aria-labelledby="order-title" gap="lg" maw={640} mx="auto">
      <Button
        component={Link}
        href="/"
        variant="subtle"
        size="lg"
        px={0}
        w="fit-content"
        leftSection={<IconArrowLeft size={24} aria-hidden="true" />}
      >
        Pulpit
      </Button>

      {isPending && <LoadingState label="Ładowanie zamówienia" height={400} />}
      {isError && <ErrorState message={error.message} />}

      {order && (
        <>
          <Stack component="header" gap={6}>
            <Group justify="space-between" align="baseline">
              <Title id="order-title" order={1}>
                Zamówienie #{order.id}
              </Title>
              <Price cents={order.totalEur} />
            </Group>
            <Badge color={ORDER_STATUS[order.status].color} variant="light" size="xl" fz="sm" fw={600} w="fit-content">
              {ORDER_STATUS[order.status].label}
            </Badge>
          </Stack>

          {order.status === "cancelled" && order.cancelReason && (
            <Alert color="gray" variant="light" title="Powód anulowania" fz="md">
              {order.cancelReason}
            </Alert>
          )}

          <BuyerDetails buyer={order.buyer} />

          <section aria-labelledby="items-title">
            <Title id="items-title" order={2} className="sr-only">
              Płyty w zamówieniu
            </Title>
            <RowList
              items={order.items}
              getKey={(item) => item.id}
              renderItem={(item) => <OrderItemRow item={item} />}
            />
          </section>

          <OrderTimeline order={order} />
          <OrderActions order={order} />
        </>
      )}
    </Stack>
  );
};

export default OrderDetail;
