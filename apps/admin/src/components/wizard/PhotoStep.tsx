"use client";

import { Button, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconScan } from "@tabler/icons-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useLabelLookup } from "@/hooks/useLookup";
import type { LabelLookupResult } from "@/types/lookup";
import PhotoPicker from "@/components/fields/PhotoPicker";
import PhotoPreview from "@/components/fields/PhotoPreview";
import StepTitle from "./StepTitle";

const MAX_PHOTOS = 2;

type PhotoStepProps = {
  /** Zdjęcia trzyma kreator, więc po cofnięciu do tego kroku nadal tu są. */
  photos: File[];
  onPhotosChange: Dispatch<SetStateAction<File[]>>;
  onRead: (result: LabelLookupResult, photos: File[]) => void;
};

/**
 * Krok 1: zdjęcie labelu (1–2, np. obie strony), odczyt przez Claude i wyszukanie na Discogs.
 * Awaria integracji nie zatrzymuje kreatora: wynik `failed` prowadzi do wpisania ręcznego.
 */
const PhotoStep = ({ photos, onPhotosChange, onRead }: PhotoStepProps) => {
  const lookup = useLabelLookup();
  const [pickError, setPickError] = useState<string | null>(null);

  const read = () => lookup.mutate(photos, { onSuccess: (result) => onRead(result, photos) });

  return (
    <Stack component="section" aria-labelledby="photo-step-title" gap="lg">
      <StepTitle
        id="photo-step-title"
        title="Zdjęcie labelu"
        description="Zrób zdjęcie naklejki na środku płyty. Możesz dodać drugie, np. strony B."
      />

      {photos.length > 0 && (
        <SimpleGrid cols={2} spacing="sm">
          {photos.map((photo, index) => (
            <PhotoPreview
              key={`${photo.name}-${index}`}
              file={photo}
              alt={`Zdjęcie labelu ${index + 1}`}
              onRemove={() => onPhotosChange(photos.filter((_, i) => i !== index))}
            />
          ))}
        </SimpleGrid>
      )}

      {photos.length < MAX_PHOTOS && (
        <PhotoPicker
          remaining={MAX_PHOTOS - photos.length}
          cameraLabel={photos.length ? "Zrób drugie zdjęcie" : "Zrób zdjęcie"}
          cameraPrimary={photos.length === 0}
          onAdd={(added) => {
            setPickError(null);
            onPhotosChange((current) => [...current, ...added].slice(0, MAX_PHOTOS));
          }}
          onError={setPickError}
        />
      )}

      {pickError && <ErrorState message={pickError} />}
      {lookup.isError && <ErrorState message={lookup.error.message} />}

      {photos.length > 0 && (
        <Button
          size="xl"
          fullWidth
          loading={lookup.isPending}
          onClick={read}
          leftSection={<IconScan size={26} aria-hidden="true" />}
        >
          Odczytaj label
        </Button>
      )}
      {lookup.isPending && (
        <Text role="status" c="dimmed" ta="center">
          Odczyt labelu i szukanie na Discogs. To trwa kilka sekund.
        </Text>
      )}
    </Stack>
  );
};

export default PhotoStep;
