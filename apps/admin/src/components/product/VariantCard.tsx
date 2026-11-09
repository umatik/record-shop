"use client";

import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import RecordThumb from "@/components/records/RecordThumb";
import { formatEur, variantPhoto } from "@/lib/format";
import { THUMB_SIZE } from "@/lib/theme";
import { describeVariant } from "@/lib/vinyl";
import type { Variant } from "@/types/product";
import VariantEditModal from "./VariantEditModal";

type VariantCardProps = {
  productId: number;
  variant: Variant;
  /** Kolejny numer na liście, do etykiety „Wariant 2” dla czytników ekranu. */
  position: number;
  /** Ostatni wiersz bez linii: pod nim jest już linia sekcji akordeonu. */
  last?: boolean;
};

/** Tłoczenie z wytwórnią i numerem katalogowym, np. „Zulu Vibes · ZV-12-004 · 2020”. */
const describePressing = (attributes: Record<string, unknown>) =>
  [attributes.label, attributes.catalogNumber, attributes.year, attributes.country].filter(Boolean).join(" · ");

/** Wariant (tłoczenie w danym stanie) jako wiersz z linią pod spodem. Kliknięcie otwiera edycję (tam też usuwanie). */
const VariantCard = ({ productId, variant, position, last = false }: VariantCardProps) => {
  const [editOpened, edit] = useDisclosure(false);
  const note = (variant.attributes.conditionNote as { pl?: string } | undefined)?.pl;
  const pressing = describePressing(variant.attributes);

  return (
    <>
      <UnstyledButton
        onClick={edit.open}
        aria-label={`Edytuj wariant ${position}: ${describeVariant(variant.attributes)}`}
        display="block"
        w="100%"
        py="md"
        style={last ? undefined : { borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        {/* Miniatura o połowę mniejsza od zdjęcia w nagłówku; wszystkie zdjęcia wariantu są w oknie edycji. */}
        <Group wrap="nowrap" align="flex-start" gap="md">
          <RecordThumb src={variantPhoto(variant)} size={THUMB_SIZE / 2} />
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fz="lg">{pressing || "—"}</Text>
            {/* Format i stan odróżniają warianty tej samej płyty. */}
            <Text fz="md" c="dimmed">
              {describeVariant(variant.attributes)}
            </Text>
            <Group justify="space-between" wrap="nowrap" gap="md">
              <Text fz="xl" fw={700}>
                {formatEur(variant.priceEur)}
              </Text>
              <Text fz="lg" fw={600} c={variant.quantity === 0 ? "red" : undefined}>
                {variant.quantity === 0 ? "wyprzedane" : `${variant.quantity} szt.`}
              </Text>
            </Group>
            {note && (
              <Text fz="lg" c="dimmed">
                {note}
              </Text>
            )}
          </Stack>
        </Group>
      </UnstyledButton>

      {editOpened && <VariantEditModal productId={productId} variant={variant} opened onClose={edit.close} />}
    </>
  );
};

export default VariantCard;
