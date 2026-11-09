import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import RecordThumb from "@/components/records/RecordThumb";
import type { ReleaseCandidate } from "@/types/lookup";
import ExternalLink from "@/components/ui/ExternalLink";

type CandidateRowProps = {
  candidate: ReleaseCandidate;
  onPick: () => void;
};

const discogsUrl = (releaseId: number) => `https://www.discogs.com/release/${releaseId}`;

/** Wydanie z Discogs do wyboru, z linkiem do strony wydania (wymóg Discogs). */
const CandidateRow = ({ candidate, onPick }: CandidateRowProps) => {
  const details = [candidate.label, candidate.catalogNumber, candidate.year, candidate.country]
    .filter(Boolean)
    .join(" · ");

  return (
    <Stack gap={4} py="md">
      <UnstyledButton onClick={onPick} w="100%">
        <Group wrap="nowrap" gap="md">
          {/* Miniatury z Discogs wolno pokazywać tylko na tej liście; nie zapisujemy ich jako zdjęć produktu. */}
          <RecordThumb src={candidate.thumbnail} />
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} fz="xl" lh={1.25} lineClamp={3}>
              {candidate.title ?? "Bez tytułu"}
            </Text>
            {details && (
              <Text c="dimmed" fz="md" lh={1.35}>
                {details}
              </Text>
            )}
            {candidate.formats.length > 0 && <Text fz="md">{candidate.formats.join(", ")}</Text>}
          </Stack>
          <IconChevronRight size={28} aria-hidden="true" />
        </Group>
      </UnstyledButton>
      {/* Przy lewej krawędzi, pod miniaturą: nie trzeba go równać z tekstem obok. */}
      <ExternalLink href={discogsUrl(candidate.releaseId)} fz="md" w="fit-content">
        Zobacz na Discogs
      </ExternalLink>
    </Stack>
  );
};

export default CandidateRow;
