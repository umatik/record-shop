import { Button, Modal, Stack, Text } from "@mantine/core";

type ShippingModalProps = {
  opened: boolean;
  onClose: () => void;
};

/** Zaślepka wysyłki do czasu integracji z InPost (docs/sprzedaz.md, krok 5). */
const ShippingModal = ({ opened, onClose }: ShippingModalProps) => (
  <Modal opened={opened} onClose={onClose} title="Wysyłka" centered size="lg">
    <Stack gap="md">
      <Text fz="lg">
        Ustawienia przesyłki (InPost: paczkomat, etykieta, numer śledzenia) powstaną w kolejnym etapie.
      </Text>
      <Button size="lg" fullWidth onClick={onClose}>
        Rozumiem
      </Button>
    </Stack>
  </Modal>
);

export default ShippingModal;
