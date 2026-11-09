"use client";

import { Button, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCash, IconMail, IconTruckDelivery, IconX } from "@tabler/icons-react";
import ErrorState from "@/components/ui/ErrorState";
import { useMarkOrderPaid } from "@/hooks/useOrders";
import type { Order } from "@/types/order";
import CancelOrderModal from "./CancelOrderModal";
import { canCancel } from "./orderStatus";
import ShippingModal from "./ShippingModal";

type OrderActionsProps = {
  order: Order;
};

/** Przyciski zależne od statusu: Wyślij, Oznacz jako opłacone, Napisz, Anuluj. */
const OrderActions = ({ order }: OrderActionsProps) => {
  const [cancelOpened, cancelModal] = useDisclosure(false);
  const [shipOpened, shipModal] = useDisclosure(false);
  const markPaid = useMarkOrderPaid(order.id);
  const mailto = `mailto:${order.buyer.email}?subject=${encodeURIComponent(`Zamówienie #${order.id} – RasBass`)}`;

  return (
    <Stack gap="sm">
      {markPaid.isError && <ErrorState message={markPaid.error.message} />}

      {order.status === "paid" && (
        <Button
          size="xl"
          fullWidth
          leftSection={<IconTruckDelivery size={26} aria-hidden="true" />}
          onClick={shipModal.open}
        >
          Wyślij
        </Button>
      )}
      {order.status === "pending" && (
        <Button
          size="xl"
          fullWidth
          leftSection={<IconCash size={26} aria-hidden="true" />}
          loading={markPaid.isPending}
          onClick={() => markPaid.mutate(undefined)}
        >
          Oznacz jako opłacone
        </Button>
      )}
      <Button
        component="a"
        href={mailto}
        size="lg"
        variant="default"
        fullWidth
        leftSection={<IconMail size={24} aria-hidden="true" />}
      >
        Napisz do kupującego
      </Button>
      {canCancel(order.status) && (
        <Button
          size="lg"
          variant="subtle"
          color="red"
          fullWidth
          leftSection={<IconX size={24} aria-hidden="true" />}
          onClick={cancelModal.open}
        >
          Anuluj zamówienie
        </Button>
      )}

      <CancelOrderModal order={order} opened={cancelOpened} onClose={cancelModal.close} />
      <ShippingModal opened={shipOpened} onClose={shipModal.close} />
    </Stack>
  );
};

export default OrderActions;
