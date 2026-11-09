"use client";

import { Button, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatEur } from "@/lib/format";
import { ApiError } from "@/services/http";
import { useState } from "react";
import GradePicker from "@/components/fields/GradePicker";
import PriceField from "@/components/fields/PriceField";
import QuantityStepper from "@/components/fields/QuantityStepper";
import ErrorState from "@/components/ui/ErrorState";
import { useDeleteVariant, useUpdateVariant } from "@/hooks/useProduct";
import {
  describeVariant,
  MEDIA_GRADES,
  SLEEVE_GRADES,
  toCents,
  type MediaCondition,
  type SleeveCondition,
} from "@/lib/vinyl";
import type { Variant } from "@/types/product";
import VariantPhotos from "./VariantPhotos";

type VariantEditModalProps = {
  productId: number;
  variant: Variant;
  opened: boolean;
  onClose: () => void;
};

/**
 * Edycja wariantu: zdjęcia, stan, cena, ilość. Zdjęcia zapisują się od razu, reszta przyciskiem „Zapisz”.
 * API zastępuje atrybuty, więc dane tłoczenia idą bez zmian.
 */
const VariantEditModal = ({ productId, variant, opened, onClose }: VariantEditModalProps) => {
  const update = useUpdateVariant(productId);
  const deleteVariant = useDeleteVariant(productId);
  const [deleteOpened, confirmDelete] = useDisclosure(false);
  const isLastOfPublished = deleteVariant.error instanceof ApiError && deleteVariant.error.status === 409;
  const [media, setMedia] = useState(variant.attributes.mediaCondition as MediaCondition);
  const [sleeve, setSleeve] = useState(variant.attributes.sleeveCondition as SleeveCondition);
  const [price, setPrice] = useState<number | string>(variant.priceEur / 100);
  const [quantity, setQuantity] = useState(variant.quantity);
  const cents = toCents(price);
  // Na telefonie pełny ekran: w wąskim oknie przyciski stanu okładki się ucinają.
  const isPhone = useMediaQuery("(max-width: 48em)");

  return (
    <Modal opened={opened} onClose={onClose} title="Edytuj wariant" centered size="lg" fullScreen={isPhone === true}>
      <Stack component="section" aria-labelledby="variant-photos-title" gap="xs" mb="lg">
        <Text id="variant-photos-title" fw={800} fz="xxl">
          Zdjęcia
        </Text>
        <Text c="dimmed">Dodane i usunięte zdjęcia zapisują się od razu.</Text>
        <VariantPhotos productId={productId} variant={variant} editable />
      </Stack>
      <Stack
        component="form"
        gap="lg"
        onSubmit={(event) => {
          event.preventDefault();
          if (!(cents > 0)) return;
          update.mutate(
            {
              variantId: variant.id,
              input: {
                priceEur: cents,
                quantity,
                attributes: { ...variant.attributes, mediaCondition: media, sleeveCondition: sleeve },
              },
            },
            { onSuccess: onClose },
          );
        }}
      >
        <GradePicker legend="Stan płyty" grades={MEDIA_GRADES} value={media} onChange={setMedia} />
        <GradePicker legend="Stan okładki" grades={SLEEVE_GRADES} value={sleeve} onChange={setSleeve} />
        <PriceField value={price} onChange={setPrice} error={cents > 0 ? null : "Wpisz cenę."} />
        {/* Ilość może spaść do zera: płyta zostaje, ale jest wyprzedana. */}
        <QuantityStepper value={quantity} onChange={setQuantity} min={0} />
        {update.isError && <ErrorState message={update.error.message} />}
        <Button type="submit" size="lg" fullWidth loading={update.isPending} disabled={!(cents > 0)}>
          Zapisz wariant
        </Button>
        <Button size="lg" variant="default" fullWidth onClick={onClose}>
          Wróć
        </Button>
        <Button
          size="lg"
          variant="subtle"
          color="red"
          fullWidth
          leftSection={<IconTrash size={22} aria-hidden="true" />}
          onClick={confirmDelete.open}
        >
          Usuń wariant
        </Button>
      </Stack>

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
        onConfirm={() =>
          deleteVariant.mutate(variant.id, {
            onSuccess: () => {
              confirmDelete.close();
              onClose();
            },
          })
        }
        onClose={confirmDelete.close}
      >
        {describeVariant(variant.attributes)}, {formatEur(variant.priceEur)}. Zdjęcia wariantu też znikną.
      </ConfirmModal>
    </Modal>
  );
};

export default VariantEditModal;
