"use client";

import { ActionIcon, Badge, Button, Group, Image, Loader, SimpleGrid, Stack, UnstyledButton } from "@mantine/core";
import { IconDisc, IconStar, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import PhotoPicker from "@/components/fields/PhotoPicker";
import ErrorState from "@/components/ui/ErrorState";
import PhotoViewer from "@/components/ui/PhotoViewer";
import { useAddDiscogsCover, useAddVariantPhotos, useDeleteMedia, useSetPrimaryMedia } from "@/hooks/useProduct";
import { mediaSrc } from "@/lib/format";
import type { Variant } from "@/types/product";

type VariantPhotosProps = {
  productId: number;
  variant: Variant;
  /** Usuwanie i dodawanie zdjęć (w oknie edycji); bez tego sam podgląd, jak w karcie wariantu. */
  editable?: boolean;
};

const MAX_PHOTOS = 10;
/** Opis, który API nadaje okładce z Discogs; po nim poznajemy, że wariant już ją ma. */
const DISCOGS_COVER_ALT = "Okładka z Discogs";

/** Zdjęcia wariantu: podgląd, a w trybie edycji także usuwanie i dodawanie z aparatu albo z pliku. */
const VariantPhotos = ({ productId, variant, editable = false }: VariantPhotosProps) => {
  const addPhotos = useAddVariantPhotos();
  const addCover = useAddDiscogsCover(productId);
  const deleteMedia = useDeleteMedia();
  const [pickError, setPickError] = useState<string | null>(null);
  const setPrimary = useSetPrimaryMedia();
  // Id zamiast kopii zdjęcia: po zmianie głównego podgląd pokazuje świeży stan.
  const [viewedId, setViewedId] = useState<number | null>(null);
  const photos = variant.media.filter((media) => media.type === "photo").sort((a, b) => a.sortOrder - b.sortOrder);
  const lastSortOrder = photos.reduce((max, photo) => Math.max(max, photo.sortOrder), 0);
  const viewed = photos.find((photo) => photo.id === viewedId);
  const viewedIndex = viewed ? photos.indexOf(viewed) : -1;
  const error = addPhotos.error ?? addCover.error ?? deleteMedia.error;
  const releaseId = variant.attributes.discogsReleaseId;
  const canAddCover =
    editable &&
    typeof releaseId === "number" &&
    photos.length < MAX_PHOTOS &&
    !photos.some((photo) => photo.alt === DISCOGS_COVER_ALT);

  return (
    <Stack gap="sm">
      {photos.length > 0 && (
        <SimpleGrid component="ul" className="plain-list" cols={3} spacing="xs" aria-label="Zdjęcia wariantu">
          {photos.map((photo, index) => (
            <li key={photo.id} style={{ position: "relative" }}>
              {/* Dotknięcie pokazuje zdjęcie w pełnym rozmiarze. */}
              <UnstyledButton
                display="block"
                w="100%"
                aria-label={`Pokaż zdjęcie ${index + 1}`}
                onClick={() => setViewedId(photo.id)}
              >
                <Image
                  src={mediaSrc(photo.url)}
                  alt={photo.alt ?? `Zdjęcie ${index + 1}`}
                  radius="sm"
                  h={104}
                  fit="cover"
                />
              </UnstyledButton>
              {photo.isPrimary && (
                <Badge size="sm" color="dark" style={{ position: "absolute", left: 4, bottom: 4 }}>
                  Główne
                </Badge>
              )}
              {editable && (
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
              )}
            </li>
          ))}
        </SimpleGrid>
      )}

      {/* Okładka z Discogs: główna akcja, gdy wariant nie ma jeszcze zdjęć; obok aparatu, gdy już jakieś ma. */}
      {canAddCover && (
        <Button
          size="lg"
          fullWidth
          variant={photos.length === 0 ? "filled" : "default"}
          leftSection={<IconDisc size={22} aria-hidden="true" />}
          loading={addCover.isPending}
          onClick={() => addCover.mutate(variant.id)}
        >
          Pobierz cover z Discogs
        </Button>
      )}
      {editable && !addPhotos.isPending && photos.length < MAX_PHOTOS && (
        <PhotoPicker
          remaining={MAX_PHOTOS - photos.length}
          cameraLabel="Aparat"
          inline
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
      <PhotoViewer
        src={viewed ? mediaSrc(viewed.url) : null}
        alt={viewed?.alt ?? `Zdjęcie ${viewedIndex + 1}`}
        onClose={() => setViewedId(null)}
        actions={
          editable &&
          viewed &&
          (viewed.isPrimary ? (
            <Badge size="xl" color="gray">
              Główne zdjęcie
            </Badge>
          ) : (
            <Button
              size="lg"
              leftSection={<IconStar size={22} aria-hidden="true" />}
              loading={setPrimary.isPending}
              onClick={() => setPrimary.mutate(viewed)}
            >
              Ustaw jako główne
            </Button>
          ))
        }
      />
      {error && <ErrorState message={error.message} />}
    </Stack>
  );
};

export default VariantPhotos;
