import { Button, Stack, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import RowList from "@/components/records/RowList";
import type { LabelReading, ReleaseCandidate, ReleaseSearchQuery } from "@/types/lookup";
import CandidateRow from "./CandidateRow";
import ReadingCard from "./ReadingCard";
import StepTitle from "./StepTitle";

type PickStepProps = {
  reading: LabelReading;
  candidates: ReleaseCandidate[];
  onPick: (candidate: ReleaseCandidate) => void;
  onManual: () => void;
  onSearch: (query: ReleaseSearchQuery) => Promise<void>;
};

/** Krok 2: wybór wydania z Discogs (także przy jednym wyniku), poprawa odczytu albo wpisanie ręczne. */
const PickStep = ({ reading, candidates, onPick, onManual, onSearch }: PickStepProps) => (
  <Stack component="section" aria-labelledby="pick-step-title" gap="lg">
    <StepTitle id="pick-step-title" title="Która to płyta?" />

    {/* key: po nowym odczycie formularz poprawek zaczyna od świeżych danych. */}
    <ReadingCard key={JSON.stringify(reading)} reading={reading} onSearch={onSearch} />

    {candidates.length === 0 ? (
      <Text role="status" fz="lg">
        Na Discogs nie ma pasujących wydań. Popraw odczyt i szukaj ponownie albo wpisz dane ręcznie.
      </Text>
    ) : (
      <RowList
        label="Wydania z Discogs"
        items={candidates}
        getKey={(candidate) => candidate.releaseId}
        renderItem={(candidate) => <CandidateRow candidate={candidate} onPick={() => onPick(candidate)} />}
      />
    )}

    <Button
      size="lg"
      variant="default"
      fullWidth
      leftSection={<IconPencil size={22} aria-hidden="true" />}
      onClick={onManual}
    >
      {candidates.length ? "Żadna z nich, wpiszę ręcznie" : "Wpisz ręcznie"}
    </Button>

    {candidates.length > 0 && (
      <Text c="dimmed" fz="sm" ta="center">
        Data provided by Discogs.
      </Text>
    )}
  </Stack>
);

export default PickStep;
