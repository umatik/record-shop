"use client";

import { ActionIcon, Badge, Group, Image, Loader, SimpleGrid, Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import PhotoPicker from "@/components/fields/PhotoPicker";
import ErrorState from "@/components/ui/ErrorState";
import { useAddVariantPhotos, useDeleteMedia } from "@/hooks/useProduct";
import { mediaSrc } from "@/lib/format";
import type { Variant } from "@/types/product";

type VariantPhotosProps = {
  variant: Variant;
};

const MAX_PHOTOS = 10;

/** Zdjęcia wariantu: podgląd, usuwanie i dodawanie z aparatu albo z pliku. */
const VariantPhotos = ({ variant }: VariantPhotosProps) => {
  const addPhotos = useAddVariantPhotos();
  const deleteMedia = useDeleteMedia();
  const [pickError, setPickError] = useState<string | null>(null);
  const photos = variant.media.filter((media) => media.type === "photo").sort((a, b) => a.sortOrder - b.sortOrder);
  const lastSortOrder = photos.reduce((max, photo) => Math.max(max, photo.sortOrder), 0);
  const error = addPhotos.error ?? deleteMedia.error;

  return (
    <Stack gap="sm">
      {photos.length > 0 && (
        <SimpleGrid component="ul" className="plain-list" cols={3} spacing="xs" aria-label="Zdjęcia wariantu">
          {photos.map((photo, index) => (
            <li key={photo.id} style={{ position: "relative" }}>
              <Image
                src={mediaSrc(photo.url)}
                alt={photo.alt ?? `Zdjęcie ${index + 1}`}
                radius="sm"
                h={104}
                fit="cover"
              />
              {photo.isPrimary && (
                <Badge size="sm" color="dark" style={{ position: "absolute", left: 4, bottom: 4 }}>
                  Główne
                </Badge>
              )}
              <ActionIcon
                size="lg"
                radius="xl"
                color="dark"
                variant="filled"
                aria-label={`Usuń zdjęcie ${index + 1}`}
                loading={deleteMedia.isPending && deleteMedia.variables === photo.id}
                onClick={() => deleteMedia.mutate(photo.id)}
                style={{ position: "absolute", top: 4, right: 4 }}
              >
                <IconTrash size={18} aria-hidden="true" />
              </ActionIcon>
            </li>
          ))}
        </SimpleGrid>
      )}

      {!addPhotos.isPending && photos.length < MAX_PHOTOS && (
        <PhotoPicker
          remaining={MAX_PHOTOS - photos.length}
          cameraLabel="Zrób zdjęcie"
          onAdd={(files) => {
            setPickError(null);
            addPhotos.mutate({ variantId: variant.id, files, after: lastSortOrder });
          }}
          onError={setPickError}
        />
      )}
      {addPhotos.isPending && (
        <Group role="status" gap="xs">
          <Loader size="sm" aria-hidden="true" />
          Wgrywanie zdjęć…
        </Group>
      )}
      {pickError && <ErrorState message={pickError} />}
      {error && <ErrorState message={error.message} />}
    </Stack>
  );
};

export default VariantPhotos;
