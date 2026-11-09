"use client";

import { Avatar, Divider, Group, Skeleton, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconDisc, IconMoodSmile } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { buyerName, count, daysSince, formatEur, mediaSrc } from "@/lib/format";
import type { ManagedOrder, ManagedOrderList, OrderStatus } from "@/lib/types";

function useOrders(status: OrderStatus, sort: "oldest" | "newest") {
  return useQuery({
    queryKey: ["orders", status, sort],
    queryFn: () => api<ManagedOrderList>(`/orders/manage?status=${status}&sort=${sort}&limit=50`),
  });
}

/** Wiersz zamówienia: płyta, kupujący, kwota, a przy opłaconych ile dni czeka na wysyłkę. */
function OrderRow({ order }: { order: ManagedOrder }) {
  const [first, ...rest] = order.items;
  const record = first ? [first.artists.join(", "), first.productTitle].filter(Boolean).join(" – ") : "";
  const waiting = order.paidAt ? daysSince(order.paidAt) : null;

  return (
    <UnstyledButton component={Link} href={`/zamowienia/${order.id}`} display="block" w="100%" py={24}>
      <Group wrap="nowrap" gap="md" align="center">
        <Avatar src={first?.photoUrl ? mediaSrc(first.photoUrl) : null} radius="sm" size={91} alt="" style={{ alignSelf: "flex-start" }}>
          <IconDisc size={38} />
        </Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} fz={24} lh={1.25} lineClamp={2}>
            {buyerName(order.buyer)}
          </Text>
          <Text c="dimmed" fz={20} lh={1.35} lineClamp={2}>
            {record}
            {rest.length > 0 && ` i ${count(rest.length, ["płyta", "płyty", "płyt"])} więcej`}
          </Text>
          {waiting !== null && (
            // Kolorowy tekst zamiast plakietki: w wąskiej kolumnie plakietka się łamała.
            <Text fz="lg" fw={700} c={waiting >= 3 ? "red.8" : waiting >= 1 ? "yellow.8" : "dimmed"}>
              {waiting === 0 ? "opłacone dziś" : `czeka ${count(waiting, ["dzień", "dni", "dni"])}`}
            </Text>
          )}
        </Stack>
        <Stack gap={4} align="flex-end">
          <Text fw={700} fz={22} style={{ whiteSpace: "nowrap" }}>
            {formatEur(order.totalEur)}
          </Text>
          <IconChevronRight size={28} />
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

function OrderRows({ orders }: { orders: ManagedOrder[] }) {
  return (
    <Stack gap={0}>
      {orders.map((order, index) => (
        <div key={order.id}>
          {index > 0 && <Divider />}
          <OrderRow order={order} />
        </div>
      ))}
    </Stack>
  );
}

/**
 * Pulpit: to, co wymaga reakcji. Na górze opłacone zamówienia do wysłania, od najstarszych.
 * „Czeka na płatność” pokazuje się tylko, gdy coś w nim jest.
 */
export function OrdersDashboard() {
  const toShip = useOrders("paid", "oldest");
  const pending = useOrders("pending", "newest");
  const toShipTotal = toShip.data?.pagination.total;
  const pendingTotal = pending.data?.pagination.total ?? 0;

  return (
    <Stack gap="xl" maw={640} mx="auto">
      <Stack gap="xs">
        <Group justify="space-between" align="baseline" gap="xs">
          <Title order={1} fz={32}>
            Do wysłania
          </Title>
          {toShipTotal !== undefined && toShipTotal > 0 && (
            <Text c="dimmed" fz="lg">
              {count(toShipTotal, ["zamówienie", "zamówienia", "zamówień"])}
            </Text>
          )}
        </Group>

        {toShip.isPending && <Skeleton h={240} />}
        {toShip.isError && <Text c="red">{toShip.error.message}</Text>}
        {toShipTotal === 0 && (
          <Stack align="center" gap="xs" py="xl">
            <IconMoodSmile size={48} color="var(--mantine-color-green-7)" />
            <Text fz={22} fw={700}>
              Nic do wysłania
            </Text>
            <Text c="dimmed" fz="lg" ta="center">
              Wszystkie opłacone zamówienia są wysłane.
            </Text>
          </Stack>
        )}
        {toShip.data && <OrderRows orders={toShip.data.orders} />}
      </Stack>

      {pendingTotal > 0 && pending.data && (
        <Stack gap="xs">
          <Divider />
          <Group justify="space-between" align="baseline" gap="xs" mt="md">
            <Title order={2} fz={26}>
              Czeka na płatność
            </Title>
            <Text c="dimmed" fz="lg">
              {pendingTotal}
            </Text>
          </Group>
          <OrderRows orders={pending.data.orders} />
        </Stack>
      )}
    </Stack>
  );
}
