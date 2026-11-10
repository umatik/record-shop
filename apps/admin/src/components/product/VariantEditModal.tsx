"use client";

import { Accordion, Button, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconChevronDown, IconTrash } from "@tabler/icons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatEur } from "@/lib/format";
import { ApiError } from "@/services/http";
import { useState } from "react";
import GradePicker from "@/components/fields/GradePicker";
import PriceField from "@/components/fields/PriceField";
import QuantityStepper from "@/components/fields/QuantityStepper";
import ErrorState from "@/components/ui/ErrorState";
import { useDeleteVariant, useUpdateVariant } from "@/hooks/useProduct";
import { describeVariant, MEDIA_GRADES, toCents, type MediaCondition } from "@/lib/vinyl";
import type { Product, Variant } from "@/types/product";
import VariantAudio from "./VariantAudio";
import VariantPhotos from "./VariantPhotos";

type VariantEditModalProps = {
  product: Product;
  variant: Variant;
  opened: boolean;
  onClose: () => void;
};

/**
 * Edycja wariantu: zdjęcia, stan, cena i ilość w akordeonie. Zdjęcia zapisują się od razu, reszta przyciskiem „Zapisz”.
 * API zastępuje atrybuty, więc dane tłoczenia idą bez zmian.
 */
const VariantEditModal = ({ product, variant, opened, onClose }: VariantEditModalProps) => {
  const productId = product.id;
  const update = useUpdateVariant(productId);
  const deleteVariant = useDeleteVariant(productId);
  const [deleteOpened, confirmDelete] = useDisclosure(false);
  const isLastOfPublished = deleteVariant.error instanceof ApiError && deleteVariant.error.status === 409;
  // Stan płyty nie jest wymagany przy zapisie; okładka zostaje, jak była (edycja jej nie zmienia).
  const [media, setMedia] = useState<MediaCondition | null>((variant.attributes.mediaCondition as MediaCondition) ?? null);
  const [price, setPrice] = useState<number | string>(variant.priceEur / 100);
  const [quantity, setQuantity] = useState(variant.quantity);
  const cents = toCents(price);
  // Na telefonie pełny ekran: w wąskim oknie przyciski stanu okładki się ucinają.
  const isPhone = useMediaQuery("(max-width: 48em)");

  const save = () => {
    // Pusta cena nie blokuje zapisu: zostaje obecna.
    update.mutate(
      {
        variantId: variant.id,
        input: {
          priceEur: cents > 0 ? cents : variant.priceEur,
          quantity,
          attributes: { ...variant.attributes, ...(media ? { mediaCondition: media } : {}) },
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edytuj wariant"
      centered
      size="lg"
      fullScreen={isPhone === true}
      styles={{ title: { fontSize: "20px" } }}
    >
      <Stack gap="lg">
        <Accordion
          multiple
          defaultValue={["photos"]}
          order={2}
          aria-label="Sekcje wariantu"
          // Ten sam wygląd co sekcje produktu: duża ikona, nagłówki i treść bez wcięcia z boków.
          chevron={<IconChevronDown size={28} aria-hidden="true" />}
          chevronSize={28}
          styles={{
            label: { fontSize: "19px", fontWeight: 700 },
            control: { paddingInline: 0 },
            content: { paddingInline: 0 },
          }}
        >
          <Accordion.Item value="photos">
            <Accordion.Control>Zdjęcia</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text c="dimmed">Dodane i usunięte zdjęcia zapisują się od razu.</Text>
                <VariantPhotos productId={productId} variant={variant} editable />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="condition">
            <Accordion.Control>Stan płyty</Accordion.Control>
            <Accordion.Panel>
              <GradePicker legend="Stan płyty" grades={MEDIA_GRADES} value={media} onChange={setMedia} />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="price">
            <Accordion.Control>Cena i ilość</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="lg">
                <PriceField value={price} onChange={setPrice} />
                {/* Ilość może spaść do zera: płyta zostaje, ale jest wyprzedana. */}
                <QuantityStepper value={quantity} onChange={setQuantity} min={0} />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="audio">
            <Accordion.Control>Odsłuch</Accordion.Control>
            <Accordion.Panel>
              <VariantAudio product={product} variant={variant} />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {update.isError && <ErrorState message={update.error.message} />}
        <Button size="lg" fullWidth loading={update.isPending} onClick={save}>
          Zapisz wariant
        </Button>
        <Button size="lg" variant="default" fullWidth onClick={onClose}>
          Wróć
        </Button>
        <Button
          size="lg"
          variant="subtle"
          color="danger"
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
