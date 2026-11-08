"use client";

import { Anchor, Avatar, Button, Divider, Group, Paper, Stack, Text, TextInput, Title, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconDisc, IconPencil, IconSearch } from "@tabler/icons-react";
import { useState, type ChangeEvent } from "react";
import type { LabelReading, ReleaseCandidate } from "@/lib/types";

const discogsUrl = (releaseId: number) => `https://www.discogs.com/release/${releaseId}`;

/** To, czego szukamy na Discogs: odczyt z labelu, który można poprawić. */
export interface SearchQuery {
  artist: string;
  title: string;
  label: string;
  catalogNumber: string;
}

export const queryFromReading = (reading: LabelReading): SearchQuery => ({
  artist: reading.artists.join(", "),
  title: reading.title ?? "",
  label: reading.label ?? "",
  catalogNumber: reading.catalogNumber ?? "",
});

/**
 * Co Claude odczytał z labelu. Gdy coś się nie zgadza (np. producent zamiast artysty), można to poprawić
 * i wyszukać ponownie: pyta tylko Discogs, bez ponownego, płatnego odczytu zdjęcia.
 */
function ReadingCard({
  reading,
  onSearch,
}: {
  reading: LabelReading;
  onSearch: (query: SearchQuery) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState(() => queryFromReading(reading));
  const [searching, setSearching] = useState(false);
  const set = (field: keyof SearchQuery) => (event: ChangeEvent<HTMLInputElement>) =>
    setQuery({ ...query, [field]: event.currentTarget.value });

  const who = reading.artists.join(", ");
  const details = [reading.label, reading.catalogNumber, reading.year, reading.format, reading.speed && `${reading.speed} RPM`]
    .filter(Boolean)
    .join(" · ");
  const canSearch = Boolean(query.artist.trim() || query.title.trim() || query.catalogNumber.trim());

  async function search() {
    setSearching(true);
    await onSearch(query);
    setSearching(false);
    setEditing(false);
  }

  return (
    <Paper withBorder p="md" radius="md" bg="var(--mantine-color-gray-0)">
      <Text c="dimmed" fz="md">
        Odczytane z labelu
      </Text>
      {!editing ? (
        <Stack gap="sm">
          <div>
            <Text fw={700} fz={20}>
              {[who, reading.title].filter(Boolean).join(" – ") || "Nic nie udało się odczytać"}
            </Text>
            {details && <Text fz="lg">{details}</Text>}
          </div>
          <Button variant="default" size="lg" fullWidth leftSection={<IconPencil size={22} />} onClick={() => setEditing(true)}>
            Popraw i szukaj ponownie
          </Button>
        </Stack>
      ) : (
        <Stack gap="sm" mt="xs">
          <TextInput size="lg" label="Artysta" description="Kilku rozdziel przecinkiem" value={query.artist} onChange={set("artist")} />
          <TextInput size="lg" label="Tytuł" value={query.title} onChange={set("title")} />
          <TextInput size="lg" label="Wytwórnia" value={query.label} onChange={set("label")} />
          <TextInput size="lg" label="Numer katalogowy" value={query.catalogNumber} onChange={set("catalogNumber")} />
          <Button size="lg" fullWidth leftSection={<IconSearch size={22} />} loading={searching} disabled={!canSearch} onClick={search}>
            Szukaj ponownie
          </Button>
          <Button size="lg" variant="subtle" fullWidth onClick={() => setEditing(false)} disabled={searching}>
            Anuluj
          </Button>
        </Stack>
      )}
    </Paper>
  );
}

function CandidateRow({ candidate, onPick }: { candidate: ReleaseCandidate; onPick: () => void }) {
  const details = [candidate.label, candidate.catalogNumber, candidate.year, candidate.country].filter(Boolean).join(" · ");
  return (
    <Stack gap={4} py="md">
      <UnstyledButton onClick={onPick} w="100%">
        <Group wrap="nowrap" gap="md">
          {/* Miniatury z Discogs wolno pokazywać tylko na tej liście; nie zapisujemy ich jako zdjęć produktu. */}
          <Avatar src={candidate.thumbnail} radius="sm" size={91} alt="" style={{ alignSelf: "flex-start" }}>
            <IconDisc size={38} />
          </Avatar>
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} fz={22} lh={1.25} lineClamp={3}>
              {candidate.title ?? "Bez tytułu"}
            </Text>
            {details && (
              <Text c="dimmed" fz={18} lh={1.35}>
                {details}
              </Text>
            )}
            {candidate.formats.length > 0 && <Text fz={18}>{candidate.formats.join(", ")}</Text>}
          </Stack>
          <IconChevronRight size={28} />
        </Group>
      </UnstyledButton>
      <Anchor href={discogsUrl(candidate.releaseId)} target="_blank" fz="md" pl={107}>
        Zobacz na Discogs
      </Anchor>
    </Stack>
  );
}

/** Krok 2: wybór wydania z Discogs (także przy jednym wyniku) albo wpisanie ręczne. */
export function PickStep({
  reading,
  candidates,
  onPick,
  onManual,
  onSearch,
}: {
  reading: LabelReading;
  candidates: ReleaseCandidate[];
  onPick: (candidate: ReleaseCandidate) => void;
  onManual: () => void;
  onSearch: (query: SearchQuery) => Promise<void>;
}) {
  return (
    <Stack gap="lg">
      <Title order={1} fz={32}>
        Która to płyta?
      </Title>

      {/* key: po nowym odczycie zdjęcia formularz zaczyna od świeżych danych. */}
      <ReadingCard key={JSON.stringify(reading)} reading={reading} onSearch={onSearch} />

      {candidates.length === 0 ? (
        <Text fz="lg">Na Discogs nie ma pasujących wydań. Popraw odczyt i szukaj ponownie albo wpisz dane ręcznie.</Text>
      ) : (
        <Stack gap={0}>
          {candidates.map((candidate, index) => (
            <div key={candidate.releaseId}>
              {index > 0 && <Divider />}
              <CandidateRow candidate={candidate} onPick={() => onPick(candidate)} />
            </div>
          ))}
        </Stack>
      )}

      <Button size="lg" variant="default" fullWidth leftSection={<IconPencil size={22} />} onClick={onManual}>
        {candidates.length ? "Żadna z nich, wpiszę ręcznie" : "Wpisz ręcznie"}
      </Button>

      {candidates.length > 0 && (
        <Text c="dimmed" fz="md" ta="center">
          Data provided by Discogs.
        </Text>
      )}
    </Stack>
  );
}
