import { Button, FileButton, Group, Loader, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { IconCamera, IconPhoto } from "@tabler/icons-react";
import { shrinkPhoto } from "@/lib/image";

type PhotoPickerProps = {
  /** Ile zdjęć można jeszcze dodać. */
  remaining: number;
  /** Napis przycisku aparatu, np. „Zrób zdjęcie” albo „Zrób drugie zdjęcie”. */
  cameraLabel: string;
  /** Aparat jako główna akcja (pełny kolor) czy pomocnicza. */
  cameraPrimary?: boolean;
  onAdd: (photos: File[]) => void;
  onError: (message: string) => void;
};

const ACCEPTED = "image/jpeg,image/png,image/webp";

/**
 * Dwa sposoby dodania zdjęcia: aparat (na telefonie od razu tylny) albo plik z galerii lub dysku.
 * Zdjęcia są zmniejszane w przeglądarce przed wysłaniem.
 */
const PhotoPicker = ({ remaining, cameraLabel, cameraPrimary = false, onAdd, onError }: PhotoPickerProps) => {
  const [preparing, setPreparing] = useState(false);
  const add = async (files: File[] | File | null) => {
    const list = (Array.isArray(files) ? files : files ? [files] : []).slice(0, remaining);
    if (list.length === 0) return;
    setPreparing(true);
    try {
      onAdd(await Promise.all(list.map((file) => shrinkPhoto(file))));
    } catch {
      // Np. HEIC, którego przeglądarka nie umie odczytać.
      onError("Nie udało się odczytać zdjęcia. Wybierz plik JPEG, PNG albo WebP.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Stack gap="sm">
      <FileButton onChange={add} accept="image/*" capture="environment">
        {(props) => (
          <Button
            {...props}
            disabled={preparing}
            size={cameraPrimary ? "xl" : "lg"}
            fullWidth
            variant={cameraPrimary ? "filled" : "light"}
            leftSection={<IconCamera size={26} aria-hidden="true" />}
          >
            {cameraLabel}
          </Button>
        )}
      </FileButton>
      <FileButton onChange={add} accept={ACCEPTED} multiple={remaining > 1}>
        {(props) => (
          <Button
            {...props}
            disabled={preparing}
            size="lg"
            fullWidth
            variant="default"
            leftSection={<IconPhoto size={24} aria-hidden="true" />}
          >
            {remaining > 1 ? "Wybierz pliki" : "Wybierz plik"}
          </Button>
        )}
      </FileButton>
      {preparing && (
        <Group role="status" gap="xs">
          <Loader size="sm" aria-hidden="true" />
          <Text>Przygotowywanie zdjęcia…</Text>
        </Group>
      )}
    </Stack>
  );
};

export default PhotoPicker;
