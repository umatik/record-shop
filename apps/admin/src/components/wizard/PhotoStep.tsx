"use client";

import { ActionIcon, Alert, Button, FileButton, Image, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCamera, IconPhoto, IconScan, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { shrinkPhoto } from "@/lib/image";
import type { LabelReading, PhotoLookup } from "@/lib/types";

const MAX_PHOTOS = 2;

export type PhotoResult =
  | { kind: "found"; lookup: PhotoLookup; files: File[] }
  | { kind: "failed"; message: string; photoUploadIds: string[]; reading: LabelReading | null; files: File[] };

/** Podgląd wybranego zdjęcia z przyciskiem usunięcia. */
function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  // Podgląd jako data URL: nie trzeba go zwalniać, więc podwójny efekt w trybie deweloperskim niczego nie psuje.
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

  return (
    <div style={{ position: "relative" }}>
      <Image src={url} alt="Zdjęcie labelu" radius="md" h={192} fit="cover" />
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
    </div>
  );
}

/**
 * Krok 1: zdjęcie labelu z aparatu albo z pliku (1–2 zdjęcia, np. obie strony), zmniejszone w przeglądarce,
 * wysłane do odczytu przez Claude i wyszukania na Discogs.
 */
export function PhotoStep({
  value: photos,
  onChange: setPhotos,
  onDone,
}: {
  /** Zdjęcia trzyma kreator, więc po cofnięciu do tego kroku nadal tu są. */
  value: File[];
  onChange: Dispatch<SetStateAction<File[]>>;
  onDone: (result: PhotoResult) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (files: File[] | File | null) => {
    const list = (Array.isArray(files) ? files : files ? [files] : []).slice(0, MAX_PHOTOS - photos.length);
    if (list.length === 0) return;
    setError(null);
    const shrunk = await Promise.all(list.map((file) => shrinkPhoto(file)));
    setPhotos((current) => [...current, ...shrunk].slice(0, MAX_PHOTOS));
  };

  async function read() {
    setBusy(true);
    setError(null);
    const form = new FormData();
    photos.forEach((photo) => form.append("images", photo));

    const response = await fetch("/api/proxy/products/lookup/photo", { method: "POST", body: form }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as
      | (Partial<PhotoLookup> & { message?: string })
      | null;
    setBusy(false);

    if (response?.status === 401) {
      router.replace("/login?expired=1");
      return;
    }
    if (response?.ok && body?.reading && body.candidates && body.photoUploadIds) {
      onDone({ kind: "found", lookup: body as PhotoLookup, files: photos });
      return;
    }
    // Claude albo Discogs zawiodły, ale zdjęcia są zapisane: przechodzimy do wpisania ręcznego.
    if (body?.photoUploadIds?.length) {
      onDone({
        kind: "failed",
        message: body.message ?? "Nie udało się odczytać labelu.",
        photoUploadIds: body.photoUploadIds,
        reading: body.reading ?? null,
        files: photos,
      });
      return;
    }
    setError(body?.message ?? "Nie udało się wysłać zdjęcia. Sprawdź połączenie i spróbuj ponownie.");
  }

  const canAdd = photos.length < MAX_PHOTOS;

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={1} fz={32}>
          Zdjęcie labelu
        </Title>
        <Text c="dimmed" fz="lg">
          Zrób zdjęcie naklejki na środku płyty. Możesz dodać drugie, np. strony B.
        </Text>
      </Stack>

      {photos.length > 0 && (
        <SimpleGrid cols={2} spacing="sm">
          {photos.map((photo, index) => (
            <Thumb key={`${photo.name}-${index}`} file={photo} onRemove={() => setPhotos(photos.filter((_, i) => i !== index))} />
          ))}
        </SimpleGrid>
      )}

      {canAdd && (
        <Stack gap="sm">
          {/* capture: na telefonie od razu otwiera tylny aparat. */}
          <FileButton onChange={add} accept="image/*" capture="environment">
            {(props) => (
              <Button
                {...props}
                size="xl"
                fullWidth
                variant={photos.length ? "light" : "filled"}
                leftSection={<IconCamera size={26} />}
              >
                {photos.length ? "Zrób drugie zdjęcie" : "Zrób zdjęcie"}
              </Button>
            )}
          </FileButton>
          <FileButton onChange={add} accept="image/jpeg,image/png,image/webp" multiple={photos.length === 0}>
            {(props) => (
              <Button {...props} size="lg" fullWidth variant="default" leftSection={<IconPhoto size={24} />}>
                Wybierz plik
              </Button>
            )}
          </FileButton>
        </Stack>
      )}

      {error && (
        <Alert color="red" variant="light" fz="md">
          {error}
        </Alert>
      )}

      {photos.length > 0 && (
        <Button size="xl" fullWidth loading={busy} onClick={read} leftSection={<IconScan size={26} />}>
          Odczytaj label
        </Button>
      )}
      {busy && (
        <Text c="dimmed" ta="center">
          Czytam label i szukam płyty na Discogs. To trwa kilka sekund.
        </Text>
      )}
    </Stack>
  );
}
