"use client";

import { Divider, Group, Image, Paper, Stack, Text, Title } from "@mantine/core";
import ExternalLink from "@/components/ui/ExternalLink";
import { useFilePreview } from "@/hooks/useFilePreview";
import { formatEur } from "@/lib/format";
import { describeSleeve } from "@/lib/vinyl";
import type { VariantInput } from "./condition";
import type { RecordDetails } from "./details";

type RecordSummaryProps = {
  details: RecordDetails;
  variant: VariantInput;
  cover: File | undefined;
  photoCount: number;
};

type SummaryItemProps = {
  label: string;
  value: string;
};

const SummaryItem = ({ label, value }: SummaryItemProps) => (
  <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
    <Text component="dt" c="dimmed" fz="lg">
      {label}
    </Text>
    <Text component="dd" fz="lg" fw={600} ta="right" m={0}>
      {value}
    </Text>
  </Group>
);

/** Karta z tym, co zostanie zapisane: okładka, płyta i lista definicji z danymi wariantu. */
const RecordSummary = ({ details, variant, cover, photoCount }: RecordSummaryProps) => {
  const coverUrl = useFilePreview(cover);
  const sleeve = describeSleeve(variant.sleeveCondition);
  const pressing = [details.format, details.speed && `${details.speed} RPM`, details.year].filter(Boolean).join(" · ");

  return (
    <Paper component="section" aria-labelledby="summary-record-title" withBorder radius="md" p="md">
      <Stack gap="md">
        <Group wrap="nowrap" gap="md" align="flex-start">
          {coverUrl && <Image src={coverUrl} alt="" w={115} h={115} radius="sm" fit="cover" />}
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Title id="summary-record-title" order={2} lh={1.25}>
              {details.artists}
            </Title>
            <Text fz="lg" c="dimmed">
              {details.title}
            </Text>
          </Stack>
        </Group>
        <Divider />
        <Stack component="dl" gap="md" m={0}>
          <SummaryItem label="Tłoczenie" value={pressing || "—"} />
          <SummaryItem
            label="Wytwórnia"
            value={[details.label, details.catalogNumber].filter(Boolean).join(" · ") || "—"}
          />
          <SummaryItem label="Stan" value={`${variant.mediaCondition} · ${sleeve}`} />
          <SummaryItem label="Cena" value={formatEur(variant.priceEur)} />
          <SummaryItem label="Ilość" value={String(variant.quantity)} />
          <SummaryItem label="Zdjęcia" value={String(photoCount)} />
          {variant.conditionNote && <SummaryItem label="Notatka" value={variant.conditionNote.pl} />}
        </Stack>
        {details.discogsReleaseId && (
          <Text fz="sm" c="dimmed">
            Data provided by Discogs.{" "}
            <ExternalLink href={`https://www.discogs.com/release/${details.discogsReleaseId}`} inherit>
              Zobacz wydanie
            </ExternalLink>
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

export default RecordSummary;
