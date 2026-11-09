"use client";

import { Button, SimpleGrid, Stack } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import ErrorState from "@/components/ui/ErrorState";
import PhotoPicker from "@/components/fields/PhotoPicker";
import PhotoPreview from "@/components/fields/PhotoPreview";
import StepTitle from "./StepTitle";

const MAX_EXTRA_PHOTOS = 8;

type PhotosStepProps = {
  labelPhotos: File[];
  extraPhotos: File[];
  onExtraPhotosChange: Dispatch<SetStateAction<File[]>>;
  onNext: () => void;
};

/**
 * Krok 5: zdjęcie labelu jest już zapisane i zostaje zdjęciem głównym. Tu można dodać okładkę,
 * tył okładki czy uszkodzenia; wgrywamy je po zapisaniu płyty.
 */
const PhotosStep = ({ labelPhotos, extraPhotos, onExtraPhotosChange, onNext }: PhotosStepProps) => {
  const [pickError, setPickError] = useState<string | null>(null);

  return (
    <Stack component="section" aria-labelledby="photos-step-title" gap="lg">
      <StepTitle
        id="photos-step-title"
        title="Zdjęcia"
        description="Dodaj okładkę, tył albo widoczne uszkodzenia. Zdjęcie labelu już jest."
      />

      <SimpleGrid component="ul" className="plain-list" cols={2} spacing="sm" aria-label="Zdjęcia płyty">
        {labelPhotos.map((file, index) => (
          <li key={`label-${index}`}>
            <PhotoPreview
              file={file}
              alt={`Zdjęcie labelu ${index + 1}`}
              badge={index === 0 ? "Główne · label" : "Label"}
            />
          </li>
        ))}
        {extraPhotos.map((file, index) => (
          <li key={`extra-${index}-${file.name}`}>
            <PhotoPreview
              file={file}
              alt={`Zdjęcie ${index + 1}`}
              onRemove={() => onExtraPhotosChange(extraPhotos.filter((_, i) => i !== index))}
            />
          </li>
        ))}
      </SimpleGrid>

      {extraPhotos.length < MAX_EXTRA_PHOTOS && (
        <PhotoPicker
          remaining={MAX_EXTRA_PHOTOS - extraPhotos.length}
          cameraLabel="Zrób zdjęcie"
          onAdd={(added) => {
            setPickError(null);
            onExtraPhotosChange((current) => [...current, ...added].slice(0, MAX_EXTRA_PHOTOS));
          }}
          onError={setPickError}
        />
      )}
      {pickError && <ErrorState message={pickError} />}

      <Button size="xl" fullWidth rightSection={<IconArrowRight size={26} aria-hidden="true" />} onClick={onNext}>
        Dalej: podsumowanie
      </Button>
    </Stack>
  );
};

export default PhotosStep;
