"use client";

import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconCash, IconDisc, IconMail, IconTruckDelivery, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { buyerName, formatDateTime, formatEur, mediaSrc } from "@/lib/format";
import type { ManagedOrder, OrderStatus } from "@/lib/types";

const STATUS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Czeka na płatność", color: "yellow" },
  paid: { label: "Opłacone, do wysłania", color: "blue" },
  shipped: { label: "Wysłane", color: "green" },
  delivered: { label: "Doręczone", color: "green" },
  cancelled: { label: "Anulowane", color: "gray" },
};

const sleeveLabel: Record<string, string> = { generic: "okładka firmowa", no_cover: "bez okładki" };

function conditionOf(attributes: Record<string, unknown>) {
  const media = attributes.mediaCondition as string | undefined;
  const sleeve = attributes.sleeveCondition as string | undefined;
  const format = attributes.format as string | undefined;
  return [format, media, sleeve && (sleeveLabel[sleeve] ?? `okładka ${sleeve}`)].filter(Boolean).join(" · ");
}

/** Zmiany statusu z panelu; odświeżają pulpit i listy płyt (anulowanie zwraca płyty do sprzedaży). */
function useOrderAction(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, body }: { action: "mark-paid" | "cancel"; body?: unknown }) =>
      api<{ order: ManagedOrder }>(`/orders/${orderId}/${action}`, {
        method: "POST",
        ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
      }),
    onSuccess: async ({ order }) => {
      queryClient.setQueryData(["order", orderId], order);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * Widok zamówienia: kto kupił, co kupił, za ile i co dalej. Przyciski zależą od statusu:
 * Wyślij (opłacone), Oznacz jako opłacone (czeka na płatność), Anuluj (przed wysyłką), Napisz (zawsze).
 */
export function OrderDetail({ orderId }: { orderId: number }) {
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<{ order: ManagedOrder }>(`/orders/manage/${orderId}`).then((r) => r.order),
  });
  const action = useOrderAction(orderId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (order.isPending) return <Skeleton h={400} maw={640} mx="auto" />;
  if (order.isError) return <Alert color="red">{order.error.message}</Alert>;

  const o = order.data;
  const status = STATUS[o.status];
  const canCancel = o.status === "pending" || o.status === "paid";
  const address = [o.buyer.address, [o.buyer.postalCode, o.buyer.city].filter(Boolean).join(" "), o.buyer.country]
    .filter(Boolean)
    .join(", ");
  const mailto = `mailto:${o.buyer.email}?subject=${encodeURIComponent(`Zamówienie #${o.id} – RasBass`)}`;

  return (
    <Stack gap="lg" maw={640} mx="auto">
      <Button component={Link} href="/" variant="subtle" size="lg" px={0} leftSection={<IconArrowLeft size={24} />} w="fit-content">
        Pulpit
      </Button>

      <Stack gap={6}>
        <Group justify="space-between" align="baseline">
          <Title order={1} fz={32}>
            Zamówienie #{o.id}
          </Title>
          <Text fw={700} fz={24}>
            {formatEur(o.totalEur)}
          </Text>
        </Group>
        <Badge color={status.color} variant="light" size="xl" fz="md" fw={600} w="fit-content">
          {status.label}
        </Badge>
      </Stack>

      {action.isError && (
        <Alert color="red" variant="light" fz="md">
          {action.error.message}
        </Alert>
      )}

      {o.status === "cancelled" && o.cancelReason && (
        <Alert color="gray" variant="light" title="Powód anulowania" fz="md">
          {o.cancelReason}
        </Alert>
      )}

      <Paper withBorder radius="md" p="md">
        <Stack gap={6}>
          <Text c="dimmed" fz="md">
            Kupujący
          </Text>
          <Text fw={700} fz={24} lh={1.25}>
            {buyerName(o.buyer)}
          </Text>
          <Anchor href={`mailto:${o.buyer.email}`} fz="lg">
            {o.buyer.email}
          </Anchor>
          {o.buyer.phone && (
            <Anchor href={`tel:${o.buyer.phone}`} fz="lg">
              {o.buyer.phone}
            </Anchor>
          )}
          <Text fz="lg">{address || "Brak adresu"}</Text>
        </Stack>
      </Paper>

      <Stack gap={0}>
        {o.items.map((item, index) => (
          <div key={item.id}>
            {index > 0 && <Divider />}
            <Group wrap="nowrap" gap="md" py="md" align="flex-start">
              <Avatar src={item.photoUrl ? mediaSrc(item.photoUrl) : null} radius="sm" size={91} alt="">
                <IconDisc size={38} />
              </Avatar>
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={700} fz={22} lh={1.25} lineClamp={2}>
                  {item.artists.join(", ") || item.productTitle}
                </Text>
                <Text c="dimmed" fz={20} lineClamp={2}>
                  {item.productTitle}
                </Text>
                <Text fz="lg">{conditionOf(item.variantAttributes)}</Text>
              </Stack>
              <Stack gap={0} align="flex-end">
                <Text fw={700} fz={20} style={{ whiteSpace: "nowrap" }}>
                  {formatEur(item.priceEur * item.quantity)}
                </Text>
                {item.quantity > 1 && <Text c="dimmed">{item.quantity} szt.</Text>}
              </Stack>
            </Group>
          </div>
        ))}
      </Stack>

      <Stack gap={2}>
        <Text c="dimmed" fz="md">
          Złożone {formatDateTime(o.createdAt)}
        </Text>
        {o.paidAt && (
          <Text c="dimmed" fz="md">
            Opłacone {formatDateTime(o.paidAt)}
          </Text>
        )}
        {o.cancelledAt && (
          <Text c="dimmed" fz="md">
            Anulowane {formatDateTime(o.cancelledAt)}
          </Text>
        )}
      </Stack>

      <Stack gap="sm">
        {o.status === "paid" && (
          <Button size="xl" fullWidth leftSection={<IconTruckDelivery size={26} />} onClick={() => setShipOpen(true)}>
            Wyślij
          </Button>
        )}
        {o.status === "pending" && (
          <Button
            size="xl"
            fullWidth
            leftSection={<IconCash size={26} />}
            loading={action.isPending}
            onClick={() => action.mutate({ action: "mark-paid" })}
          >
            Oznacz jako opłacone
          </Button>
        )}
        <Button component="a" href={mailto} size="lg" variant="default" fullWidth leftSection={<IconMail size={24} />}>
          Napisz do kupującego
        </Button>
        {canCancel && (
          <Button size="lg" variant="subtle" color="red" fullWidth leftSection={<IconX size={24} />} onClick={() => setCancelOpen(true)}>
            Anuluj zamówienie
          </Button>
        )}
      </Stack>

      <Modal opened={cancelOpen} onClose={() => setCancelOpen(false)} title="Anulować zamówienie?" centered size="lg">
        <Stack gap="md">
          <Text fz="lg">
            Płyty wrócą do sprzedaży.
            {o.status === "paid" && " Zwrot pieniędzy zrób na razie ręcznie, automatyczny przyjdzie razem ze Stripe."}
          </Text>
          <Textarea
            size="lg"
            autosize
            minRows={3}
            label="Powód dla kupującego"
            placeholder="Płyta została uszkodzona przy pakowaniu"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <Button
            size="lg"
            color="red"
            fullWidth
            disabled={!reason.trim()}
            loading={action.isPending}
            onClick={() =>
              action.mutate({ action: "cancel", body: { reason: reason.trim() } }, { onSuccess: () => setCancelOpen(false) })
            }
          >
            Anuluj zamówienie
          </Button>
          <Button size="lg" variant="default" fullWidth onClick={() => setCancelOpen(false)}>
            Wróć
          </Button>
        </Stack>
      </Modal>

      <Modal opened={shipOpen} onClose={() => setShipOpen(false)} title="Wysyłka" centered size="lg">
        <Stack gap="md">
          <Text fz="lg">
            Ustawienia przesyłki (InPost: paczkomat, etykieta, numer śledzenia) powstaną w kolejnym etapie, opisanym w
            docs/sprzedaz.md.
          </Text>
          <Button size="lg" fullWidth onClick={() => setShipOpen(false)}>
            Rozumiem
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
