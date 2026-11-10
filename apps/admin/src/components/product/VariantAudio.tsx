"use client";

import { ActionIcon, Button, FileButton, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useAddVariantAudio, useDeleteMedia } from "@/hooks/useProduct";
import { mediaSrc } from "@/lib/format";
import type { Product, Variant } from "@/types/product";

type VariantAudioProps = {
  product: Product;
  variant: Variant;
};

const ACCEPTED = "audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav";

/** Nazwa do pliku: bez polskich znaków i spacji, małymi literami, np. „Zulu Vibes” → „zulu-vibes”. */
const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Plik audio do odsłuchu wariantu. Gdy płyta ma tracklistę, wybór utworu z listy; wgrany utwór znika z listy.
 * Plik dostaje nazwę `id-produktu-glowny-artysta-tytul-utworu.ext`.
 */
const VariantAudio = ({ product, variant }: VariantAudioProps) => {
  const addAudio = useAddVariantAudio();
  const deleteMedia = useDeleteMedia();
  const [pickError, setPickError] = useState<string | null>(null);
  const [track, setTrack] = useState<string | null>(null);
  const tracks = variant.media.filter((media) => media.type === "audio");
  const error = addAudio.error ?? deleteMedia.error;

  // Utwory z tracklisty, które nie mają jeszcze pliku w tym wariancie (tytuł zapisany w `alt` pliku).
  const uploadedTitles = new Set(tracks.map((media) => media.alt));
  const tracklist = product.attributes.tracklist ?? [];
  const available = tracklist
    .filter((item) => !uploadedTitles.has(item.title))
    .map((item) => ({ value: item.title, label: item.position ? `${item.position} ${item.title}` : item.title }));

  const artist = product.attributes.artists?.[0] ?? "";

  const upload = (file: File) => {
    setPickError(null);
    if (!/\.(mp3|wav)$/i.test(file.name)) {
      setPickError("Wybierz plik MP3 albo WAV.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
    const parts = [String(product.id), artist, track ?? ""].map(slug).filter(Boolean);
    const named = new File([file], `${parts.join("-")}.${ext}`, { type: file.type });
    addAudio.mutate(
      { variantId: variant.id, file: named, alt: track },
      { onSuccess: () => setTrack(null) },
    );
  };

  return (
    <Stack gap="sm">
      {tracks.map((item, index) => (
        <Group key={item.id} wrap="nowrap" gap="sm" align="center">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            {item.alt && <Text fw={600}>{item.alt}</Text>}
            <audio controls preload="none" src={mediaSrc(item.url)} style={{ width: "100%" }}>
              Twoja przeglądarka nie odtwarza dźwięku.
            </audio>
          </Stack>
          <ActionIcon
            size="xl"
            variant="subtle"
            color="danger"
            aria-label={`Usuń plik audio ${index + 1}`}
            loading={deleteMedia.isPending && deleteMedia.variables === item.id}
            onClick={() => deleteMedia.mutate(item.id)}
          >
            <IconTrash size={22} aria-hidden="true" />
          </ActionIcon>
        </Group>
      ))}

      {tracks.length === 0 && !addAudio.isPending && <Text c="dimmed">Brak pliku audio.</Text>}

      {!addAudio.isPending && tracklist.length > 0 && (
        <Select
          size="lg"
          label="Utwór"
          placeholder={available.length > 0 ? "Wybierz utwór" : "Wszystkie utwory mają plik"}
          data={available}
          value={track}
          onChange={setTrack}
          disabled={available.length === 0}
          allowDeselect={false}
          checkIconPosition="right"
          // Lista ma tę samą szerokość co pole i zostaje w oknie, zamiast wychodzić poza jego prawy brzeg.
          comboboxProps={{ width: "target", position: "bottom-start", middlewares: { flip: true, shift: true } }}
        />
      )}

      {!addAudio.isPending && (
        <FileButton accept={ACCEPTED} onChange={(file) => file && upload(file)} disabled={tracklist.length > 0 && !track}>
          {(props) => (
            <Button
              {...props}
              size="lg"
              fullWidth
              variant="default"
              leftSection={<IconUpload size={22} aria-hidden="true" />}
            >
              {tracks.length === 0 ? "Wyślij plik audio" : "Wyślij inny plik audio"}
            </Button>
          )}
        </FileButton>
      )}

      {addAudio.isPending && (
        <Group role="status" gap="xs">
          <Loader size="sm" aria-hidden="true" />
          Wysyłanie pliku…
        </Group>
      )}
      {pickError && <ErrorState message={pickError} />}
      {error && <ErrorState message={error.message} />}
    </Stack>
  );
};

export default VariantAudio;
