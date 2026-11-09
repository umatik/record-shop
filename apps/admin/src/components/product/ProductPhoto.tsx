"use client";

import { FileButton, Loader, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { useState } from "react";
import RecordThumb from "@/components/records/RecordThumb";
import ErrorState from "@/components/ui/ErrorState";
import { useReplaceProductPhoto } from "@/hooks/useProduct";
import { primaryPhoto } from "@/lib/format";
import { shrinkPhoto } from "@/lib/image";
import type { Product } from "@/types/product";

/** Główne zdjęcie płyty w nagłówku produktu. Dotknięcie pozwala je podmienić (aparat albo plik). */
const ProductPhoto = ({ product }: { product: Product }) => {
  const replace = useReplaceProductPhoto(product.id);
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = async (file: File | null) => {
    if (!file) return;
    setPickError(null);
    try {
      replace.mutate(await shrinkPhoto(file));
    } catch {
      setPickError("Nie udało się odczytać zdjęcia. Wybierz plik JPEG, PNG albo WebP.");
    }
  };

  return (
    <div style={{ flexShrink: 0 }}>
      <FileButton onChange={pick} accept="image/jpeg,image/png,image/webp">
        {(props) => (
          <UnstyledButton {...props} aria-label="Zmień zdjęcie płyty" pos="relative" disabled={replace.isPending}>
            <RecordThumb src={primaryPhoto(product)} />
            <ThemeIcon
              color="camoCharcoal"
              radius="xl"
              size="lg"
              pos="absolute"
              bottom={-4}
              right={-4}
              aria-hidden="true"
            >
              {replace.isPending ? <Loader size={16} color="white" /> : <IconCamera size={18} />}
            </ThemeIcon>
          </UnstyledButton>
        )}
      </FileButton>
      {(pickError ?? replace.error?.message) && <ErrorState message={(pickError ?? replace.error?.message)!} />}
    </div>
  );
};

export default ProductPhoto;
