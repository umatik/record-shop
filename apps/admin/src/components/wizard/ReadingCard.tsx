"use client";

import { Button, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconPencil, IconSearch } from "@tabler/icons-react";
import { useState, type ChangeEvent } from "react";
import type { LabelReading, ReleaseSearchQuery } from "@/types/lookup";

type ReadingCardProps = {
  reading: LabelReading;
  /** Wyszukanie po poprawionym odczycie; tylko Discogs, bez ponownego (płatnego) odczytu zdjęcia. */
  onSearch: (query: ReleaseSearchQuery) => Promise<void>;
};

const queryFromReading = (reading: LabelReading): ReleaseSearchQuery => ({
  artist: reading.artists.join(", "),
  title: reading.title ?? "",
  label: reading.label ?? "",
  catalogNumber: reading.catalogNumber ?? "",
});

/**
 * Co Claude odczytał z labelu. Gdy coś się nie zgadza (np. producent zamiast artysty), można to poprawić
 * i wyszukać ponownie.
 */
const ReadingCard = ({ reading, onSearch }: ReadingCardProps) => {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState(() => queryFromReading(reading));
  const [searching, setSearching] = useState(false);

  const set = (field: keyof ReleaseSearchQuery) => (event: ChangeEvent<HTMLInputElement>) =>
    setQuery({ ...query, [field]: event.currentTarget.value });

  const who = reading.artists.join(", ");
  const details = [
    reading.label,
    reading.catalogNumber,
    reading.year,
    reading.format,
    reading.speed && `${reading.speed} RPM`,
  ]
    .filter(Boolean)
    .join(" · ");
  const canSearch = Boolean(query.artist.trim() || query.title.trim() || query.catalogNumber.trim());

  async function search() {
    setSearching(true);
    await onSearch(query).finally(() => setSearching(false));
    setEditing(false);
  }

  return (
    <Paper component="section" aria-labelledby="reading-title" withBorder p="md" radius="md" bg="gray.0">
      <Text id="reading-title" component="h2" c="dimmed" fz="md" fw={400} m={0}>
        Odczytane z labelu
      </Text>

      {!editing ? (
        <Stack gap="sm">
          <div>
            <Text fw={700} fz="lg">
              {[who, reading.title].filter(Boolean).join(" – ") || "Nic nie udało się odczytać"}
            </Text>
            {details && <Text fz="md">{details}</Text>}
          </div>
          <Button
            variant="default"
            size="lg"
            fullWidth
            leftSection={<IconPencil size={22} aria-hidden="true" />}
            onClick={() => setEditing(true)}
          >
            Popraw i szukaj ponownie
          </Button>
        </Stack>
      ) : (
        <Stack
          component="form"
          gap="sm"
          mt="xs"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSearch) void search();
          }}
        >
          <TextInput
            size="lg"
            label="Artysta"
            description="Kilku rozdziel przecinkiem"
            value={query.artist}
            onChange={set("artist")}
          />
          <TextInput size="lg" label="Tytuł" value={query.title} onChange={set("title")} />
          <TextInput size="lg" label="Wytwórnia" value={query.label} onChange={set("label")} />
          <TextInput size="lg" label="Numer katalogowy" value={query.catalogNumber} onChange={set("catalogNumber")} />
          <Button
            type="submit"
            size="lg"
            fullWidth
            leftSection={<IconSearch size={22} aria-hidden="true" />}
            loading={searching}
            disabled={!canSearch}
          >
            Szukaj ponownie
          </Button>
          <Button size="lg" variant="subtle" fullWidth onClick={() => setEditing(false)} disabled={searching}>
            Anuluj
          </Button>
        </Stack>
      )}
    </Paper>
  );
};

export default ReadingCard;
