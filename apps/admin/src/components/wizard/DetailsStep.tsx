"use client";

import { Alert, Anchor, Badge, Button, Group, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import type { LabelReading, ProductMatch, ReleaseDraft, VinylFormat } from "@/lib/types";

/** Dane płyty w formularzu kreatora: z Discogs, z odczytu labelu albo wpisane ręcznie. */
export interface RecordDetails {
  artists: string;
  title: string;
  label: string;
  catalogNumber: string;
  year: string;
  format: VinylFormat | "";
  speed: "33" | "45" | "";
  discogsReleaseId?: number;
  tracklistCount: number;
  previewLinksCount: number;
  /** Dane z Discogs, których formularz nie pokazuje, ale zapisujemy je z płytą. */
  discogs?: {
    description: string | null;
    tracklist: ReleaseDraft["product"]["attributes"]["tracklist"];
    previewLinks: string[];
    country?: string;
    pressing?: "reissue";
  };
}

type Field = Exclude<keyof RecordDetails, "discogsReleaseId" | "tracklistCount" | "previewLinksCount" | "discogs">;

/** Pola, których Discogs nie podał, a odczytał je Claude z labelu (np. prędkość). */
export type FromLabel = Partial<Record<Field, true>>;

/** Łączy szkic z Discogs z odczytem labelu: puste pola z Discogs uzupełnia odczyt i zaznacza to. */
export function mergeDraft(draft: ReleaseDraft, reading: LabelReading | null): { details: RecordDetails; fromLabel: FromLabel } {
  const v = draft.variant.attributes;
  const fromLabel: FromLabel = {};
  const pick = <T,>(field: Field, discogs: T | undefined, label: T | null | undefined): T | undefined => {
    if (discogs !== undefined && discogs !== null && discogs !== "") return discogs;
    if (label !== undefined && label !== null && label !== "") {
      fromLabel[field] = true;
      return label;
    }
    return undefined;
  };
  const speed = pick("speed", v.speed, reading?.speed === 33 || reading?.speed === 45 ? reading.speed : null);

  return {
    details: {
      artists: draft.product.attributes.artists.join(", "),
      title: draft.product.title,
      label: pick("label", v.label, reading?.label) ?? "",
      catalogNumber: pick("catalogNumber", v.catalogNumber, reading?.catalogNumber) ?? "",
      year: String(pick("year", v.year, reading?.year) ?? ""),
      format: pick("format", v.format, reading?.format) ?? "",
      speed: speed ? (String(speed) as "33" | "45") : "",
      discogsReleaseId: v.discogsReleaseId,
      tracklistCount: draft.product.attributes.tracklist.length,
      previewLinksCount: draft.product.attributes.previewLinks.length,
      discogs: {
        description: draft.product.description,
        tracklist: draft.product.attributes.tracklist,
        previewLinks: draft.product.attributes.previewLinks,
        ...(v.country ? { country: v.country } : {}),
        ...(v.pressing ? { pressing: v.pressing } : {}),
      },
    },
    fromLabel,
  };
}

/** Formularz ręczny wypełniony tym, co Claude odczytał z labelu. */
export function detailsFromReading(reading: LabelReading | null): RecordDetails {
  return {
    artists: reading?.artists.join(", ") ?? "",
    title: reading?.title ?? "",
    label: reading?.label ?? "",
    catalogNumber: reading?.catalogNumber ?? "",
    year: reading?.year ? String(reading.year) : "",
    format: reading?.format ?? "",
    speed: reading?.speed === 33 || reading?.speed === 45 ? (String(reading.speed) as "33" | "45") : "",
    tracklistCount: 0,
    previewLinksCount: 0,
  };
}

const matchReason: Record<ProductMatch["matchedBy"][number], string> = {
  discogs_release: "to samo wydanie",
  catalog_number: "ten sam numer katalogowy",
  title_artist: "ten sam album, inne tłoczenie",
};

function FromLabelHint({ show }: { show?: true }) {
  return show ? (
    <Badge color="blue" variant="light" size="lg" fz="sm">
      z labelu
    </Badge>
  ) : null;
}

/**
 * Krok 3: sprawdzenie i poprawa danych płyty. Pokazuje też płyty, które już są w sklepie,
 * bo nowa sztuka zwykle powinna być wariantem istniejącego produktu.
 */
export function DetailsStep({
  value: details,
  onChange,
  fromLabel = {},
  existingProducts = [],
  onNext,
}: {
  value: RecordDetails;
  /** Zmiany od razu trafiają do kreatora, więc po cofnięciu i powrocie nic nie znika. */
  onChange: (patch: Partial<RecordDetails>) => void;
  fromLabel?: FromLabel;
  existingProducts?: ProductMatch[];
  onNext: () => void;
}) {
  const set = (field: Field) => (value: string) => onChange({ [field]: value });
  const input = (field: Field, label: string, props: { inputMode?: "numeric"; placeholder?: string } = {}) => (
    <TextInput
      size="lg"
      label={
        <Group gap="xs" component="span">
          {label}
          <FromLabelHint show={fromLabel[field]} />
        </Group>
      }
      value={details[field]}
      onChange={(event) => set(field)(event.currentTarget.value)}
      {...props}
    />
  );

  return (
    <Stack gap="lg">
      <Title order={1} fz={32}>
        Sprawdź dane
      </Title>

      {existingProducts.length > 0 && (
        <Alert color="yellow" variant="light" title="Ta płyta może już być w sklepie" fz="md">
          <Stack gap="xs">
            {existingProducts.map((match) => (
              <Text key={match.productId} fz="lg">
                <b>{[match.artists.join(", "), match.title].filter(Boolean).join(" – ")}</b>
                {" · "}
                {match.matchedBy.map((reason) => matchReason[reason]).join(", ")}
                {match.isPublished ? "" : " · szkic"}
              </Text>
            ))}
            <Text fz="md">Dodanie jako kolejnej sztuki istniejącej płyty pojawi się w następnym kroku.</Text>
          </Stack>
        </Alert>
      )}

      {input("artists", "Artysta")}
      {input("title", "Tytuł")}
      {input("label", "Wytwórnia")}
      {input("catalogNumber", "Numer katalogowy")}
      {input("year", "Rok", { inputMode: "numeric" })}

      <Stack gap={6}>
        <Group gap="xs">
          <Text fw={500} fz="lg">
            Format
          </Text>
          <FromLabelHint show={fromLabel.format} />
        </Group>
        <SegmentedControl
          fullWidth
          size="lg"
          value={details.format}
          onChange={set("format")}
          data={["LP", '12"', '10"', '7"']}
        />
      </Stack>

      <Stack gap={6}>
        <Group gap="xs">
          <Text fw={500} fz="lg">
            Prędkość
          </Text>
          <FromLabelHint show={fromLabel.speed} />
        </Group>
        <SegmentedControl
          fullWidth
          size="lg"
          value={details.speed}
          onChange={set("speed")}
          data={[
            { value: "33", label: "33 RPM" },
            { value: "45", label: "45 RPM" },
          ]}
        />
      </Stack>

      {details.discogsReleaseId && (
        <Text fz="md" c="dimmed">
          Z Discogs: {details.tracklistCount} utworów, {details.previewLinksCount} linków do odsłuchu. Data provided by
          Discogs.{" "}
          <Anchor href={`https://www.discogs.com/release/${details.discogsReleaseId}`} target="_blank" inherit>
            Zobacz wydanie
          </Anchor>
        </Text>
      )}

      <Button size="xl" fullWidth rightSection={<IconArrowRight size={26} />} onClick={onNext}>
        Dalej: stan i cena
      </Button>
    </Stack>
  );
}
