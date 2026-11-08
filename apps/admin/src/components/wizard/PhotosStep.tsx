"use client";

import { ActionIcon, Badge, Button, FileButton, Image, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconCamera, IconPhoto, IconX } from "@tabler/icons-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { shrinkPhoto } from "@/lib/image";

/** Do 10 MB na plik w API; zmniejszone zdjęcie ma zwykle kilkaset KB. */
const MAX_EXTRA_PHOTOS = 8;

/** Podgląd pliku jako data URL (nie trzeba go zwalniać, więc podwójny efekt w trybie deweloperskim nie szkodzi). */
export function usePreview(file: File) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    const reader = new FileReader();
    reader.onload = () => active && setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => {
      active = false;
    };
  }, [file]);
  return url;
}

function PhotoTile({ file, badge, onRemove }: { file: File; badge?: string; onRemove?: () => void }) {
  const url = usePreview(file);
  return (
    <div style={{ position: "relative" }}>
      <Image src={url} alt="" radius="md" h={192} fit="cover" />
      {badge && (
        <Badge size="lg" color="dark" style={{ position: "absolute", left: 8, bottom: 8 }}>
          {badge}
        </Badge>
      )}
      {onRemove && (
        <ActionIcon
          onClick={onRemove}
          size="xl"
          radius="xl"
          color="dark"
          variant="filled"
          aria-label="Usuń zdjęcie"
          style={{ position: "absolute", top: 8, right: 8 }}
        >
          <IconX size={22} />
        </ActionIcon>
      )}
    </div>
  );
}

/**
 * Krok 5: zdjęcie labelu jest już zapisane i zostaje zdjęciem głównym. Tu można dodać okładkę,
 * tył okładki czy uszkodzenia; wgramy je po zapisaniu płyty.
 */
export function PhotosStep({
  labelPhotos,
  value: extra,
  onChange: setExtra,
  onNext,
}: {
  labelPhotos: File[];
  value: File[];
  onChange: Dispatch<SetStateAction<File[]>>;
  onNext: () => void;
}) {

  const add = async (files: File[] | File | null) => {
    const list = (Array.isArray(files) ? files : files ? [files] : []).slice(0, MAX_EXTRA_PHOTOS - extra.length);
    const shrunk = await Promise.all(list.map((file) => shrinkPhoto(file)));
    setExtra((current) => [...current, ...shrunk].slice(0, MAX_EXTRA_PHOTOS));
  };

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={1} fz={32}>
          Zdjęcia
        </Title>
        <Text c="dimmed" fz="lg">
          Dodaj okładkę, tył albo widoczne uszkodzenia. Zdjęcie labelu już jest.
        </Text>
      </Stack>

      <SimpleGrid cols={2} spacing="sm">
        {labelPhotos.map((file, index) => (
          <PhotoTile key={`label-${index}`} file={file} badge={index === 0 ? "Główne · label" : "Label"} />
        ))}
        {extra.map((file, index) => (
          <PhotoTile key={`extra-${index}-${file.name}`} file={file} onRemove={() => setExtra(extra.filter((_, i) => i !== index))} />
        ))}
      </SimpleGrid>

      {extra.length < MAX_EXTRA_PHOTOS && (
        <Stack gap="sm">
          <FileButton onChange={add} accept="image/*" capture="environment">
            {(props) => (
              <Button {...props} size="lg" fullWidth variant="light" leftSection={<IconCamera size={24} />}>
                Zrób zdjęcie
              </Button>
            )}
          </FileButton>
          <FileButton onChange={add} accept="image/jpeg,image/png,image/webp" multiple>
            {(props) => (
              <Button {...props} size="lg" fullWidth variant="default" leftSection={<IconPhoto size={24} />}>
                Wybierz pliki
              </Button>
            )}
          </FileButton>
        </Stack>
      )}

      <Button size="xl" fullWidth rightSection={<IconArrowRight size={26} />} onClick={onNext}>
        {extra.length ? "Dalej: podsumowanie" : "Pomiń, dalej"}
      </Button>
    </Stack>
  );
}
