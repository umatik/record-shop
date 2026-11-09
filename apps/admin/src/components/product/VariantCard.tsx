"use client";

import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useDeleteVariant } from "@/hooks/useProduct";
import { formatEur } from "@/lib/format";
import { describeVariant } from "@/lib/vinyl";
import { ApiError } from "@/services/http";
import type { Variant } from "@/types/product";
import VariantEditModal from "./VariantEditModal";
import VariantPhotos from "./VariantPhotos";

type VariantCardProps = {
  productId: number;
  variant: Variant;
  /** Kolejny numer na liście, do nagłówka „Wariant 2”. */
  position: number;
};

type DetailProps = {
  label: string;
  value: string;
};

const Detail = ({ label, value }: DetailProps) => (
  <Group justify="space-between" wrap="nowrap" gap="md">
    <Text component="dt" c="dimmed" fz="lg">
      {label}
    </Text>
    <Text component="dd" fz="lg" fw={600} ta="right" m={0}>
      {value}
    </Text>
  </Group>
);

/** Tłoczenie z wytwórnią i numerem katalogowym, np. „Zulu Vibes · ZV-12-004 · 2020”. */
const describePressing = (attributes: Record<string, unknown>) =>
  [attributes.label, attributes.catalogNumber, attributes.year, attributes.country].filter(Boolean).join(" · ");

/** Wariant (tłoczenie w danym stanie): zdjęcia, dane, edycja i usuwanie. */
const VariantCard = ({ productId, variant, position }: VariantCardProps) => {
  const [editOpened, edit] = useDisclosure(false);
  const [deleteOpened, confirmDelete] = useDisclosure(false);
  const deleteVariant = useDeleteVariant(productId);
  const isLastOfPublished = deleteVariant.error instanceof ApiError && deleteVariant.error.status === 409;
  const note = (variant.attributes.conditionNote as { pl?: string } | undefined)?.pl;
  const titleId = `variant-${variant.id}-title`;

  return (
    <Paper component="section" aria-labelledby={titleId} withBorder radius="md" p="md">
      <Stack gap="md">
        <Title id={titleId} order={3}>
          Wariant {position}: {describeVariant(variant.attributes)}
        </Title>

        <VariantPhotos variant={variant} />

        <Stack component="dl" gap="sm" m={0}>
          <Detail label="Tłoczenie" value={describePressing(variant.attributes) || "—"} />
          <Detail label="Cena" value={formatEur(variant.priceEur)} />
          <Detail label="Ilość" value={variant.quantity === 0 ? "wyprzedane" : String(variant.quantity)} />
          {note && <Detail label="Notatka" value={note} />}
        </Stack>

        <Group grow gap="sm">
          <Button
            size="lg"
            variant="light"
            leftSection={<IconPencil size={22} aria-hidden="true" />}
            onClick={edit.open}
          >
            Edytuj
          </Button>
          <Button
            size="lg"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={22} aria-hidden="true" />}
            onClick={confirmDelete.open}
          >
            Usuń
          </Button>
        </Group>
      </Stack>

      {editOpened && <VariantEditModal productId={productId} variant={variant} opened onClose={edit.close} />}
      <ConfirmModal
        opened={deleteOpened}
        title="Usunąć wariant?"
        confirmLabel="Usuń wariant"
        danger
        loading={deleteVariant.isPending}
        error={
          isLastOfPublished
            ? "To jedyny wariant płyty w sprzedaży. Wycofaj płytę ze sprzedaży albo usuń cały produkt."
            : (deleteVariant.error?.message ?? null)
        }
        onConfirm={() => deleteVariant.mutate(variant.id, { onSuccess: confirmDelete.close })}
        onClose={confirmDelete.close}
      >
        {describeVariant(variant.attributes)}, {formatEur(variant.priceEur)}. Zdjęcia wariantu też znikną.
      </ConfirmModal>
    </Paper>
  );
};

export default VariantCard;
