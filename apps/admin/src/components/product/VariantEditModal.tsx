"use client";

import { Button, Modal, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";
import GradePicker from "@/components/fields/GradePicker";
import PriceField from "@/components/fields/PriceField";
import QuantityStepper from "@/components/fields/QuantityStepper";
import ErrorState from "@/components/ui/ErrorState";
import { useUpdateVariant } from "@/hooks/useProduct";
import { MEDIA_GRADES, SLEEVE_GRADES, toCents, type MediaCondition, type SleeveCondition } from "@/lib/vinyl";
import type { Variant } from "@/types/product";

type VariantEditModalProps = {
  productId: number;
  variant: Variant;
  opened: boolean;
  onClose: () => void;
};

/** Edycja wariantu: stan, cena, ilość. API zastępuje atrybuty, więc dane tłoczenia idą bez zmian. */
const VariantEditModal = ({ productId, variant, opened, onClose }: VariantEditModalProps) => {
  const update = useUpdateVariant(productId);
  const [media, setMedia] = useState(variant.attributes.mediaCondition as MediaCondition);
  const [sleeve, setSleeve] = useState(variant.attributes.sleeveCondition as SleeveCondition);
  const [price, setPrice] = useState<number | string>(variant.priceEur / 100);
  const [quantity, setQuantity] = useState(variant.quantity);
  const cents = toCents(price);
  // Na telefonie pełny ekran: w wąskim oknie przyciski stanu okładki się ucinają.
  const isPhone = useMediaQuery("(max-width: 48em)");

  return (
    <Modal opened={opened} onClose={onClose} title="Edytuj wariant" centered size="lg" fullScreen={isPhone === true}>
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
      </Stack>
    </Modal>
  );
};

export default VariantEditModal;
