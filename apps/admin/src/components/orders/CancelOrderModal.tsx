"use client";

import { Button, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useCancelOrder } from "@/hooks/useOrders";
import type { Order } from "@/types/order";

type CancelOrderModalProps = {
  order: Order;
  opened: boolean;
  onClose: () => void;
};

/** Anulowanie z powodem dla kupującego; płyty wracają do sprzedaży. */
const CancelOrderModal = ({ order, opened, onClose }: CancelOrderModalProps) => {
  const [reason, setReason] = useState("");
  const cancel = useCancelOrder(order.id);

  return (
    <Modal opened={opened} onClose={onClose} title="Anulować zamówienie?" centered size="lg">
      <Stack gap="md">
        <Text fz="lg">
          Płyty wrócą do sprzedaży.
          {order.status === "paid" && " Zwrot pieniędzy zrób na razie ręcznie, automatyczny przyjdzie razem ze Stripe."}
        </Text>
        <Textarea
          size="lg"
          autosize
          minRows={3}
          label="Powód dla kupującego"
          placeholder="Płyta została uszkodzona przy pakowaniu"
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          required
        />
        {cancel.isError && <ErrorState message={cancel.error.message} />}
        <Button
          size="lg"
          color="danger"
          fullWidth
          disabled={!reason.trim()}
          loading={cancel.isPending}
          onClick={() => cancel.mutate(reason.trim(), { onSuccess: onClose })}
        >
          Anuluj zamówienie
        </Button>
        <Button size="lg" variant="default" fullWidth onClick={onClose}>
          Wróć
        </Button>
      </Stack>
    </Modal>
  );
};

export default CancelOrderModal;
