import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import type { ProductMatch } from "@/types/lookup";
import type { DetailsField, FromLabel, RecordDetails } from "./details";
import ExistingProductsAlert from "./ExistingProductsAlert";
import FromLabelHint from "./FromLabelHint";
import StepTitle from "./StepTitle";
import ExternalLink from "@/components/ui/ExternalLink";

type DetailsStepProps = {
  details: RecordDetails;
  /** Zmiany od razu trafiają do kreatora, więc po cofnięciu i powrocie nic nie znika. */
  onChange: (patch: Partial<RecordDetails>) => void;
  fromLabel: FromLabel;
  existingProducts: ProductMatch[];
  target: ProductMatch | null;
  destination: number | "new" | null;
  onDestination: (value: number | "new") => void;
  onNext: () => void;
};

const TEXT_FIELDS: { field: DetailsField; label: string }[] = [
  { field: "artists", label: "Artysta" },
  { field: "title", label: "Tytuł" },
];

type ReadOnlyValueProps = { label: string; value: string };

/** Wiersz danych tylko do odczytu: etykieta po lewej, wartość po prawej, linia pod spodem. */
const ReadOnlyValue = ({ label, value }: ReadOnlyValueProps) => (
  <Group
    justify="space-between"
    wrap="nowrap"
    gap="md"
    align="baseline"
    py="xs"
    style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
  >
    <Text component="dt" c="dimmed" fz="md" style={{ flexShrink: 0 }}>
      {label}
    </Text>
    <Text component="dd" fz="lg" fw={600} ta="right" m={0}>
      {value || "—"}
    </Text>
  </Group>
);

/** Krok 3: artysta i tytuł płyty (dane produktu), z ostrzeżeniem o płytach, które już są w sklepie. */
const DetailsStep = ({
  details,
  onChange,
  fromLabel,
  existingProducts,
  target,
  destination,
  onDestination,
  onNext,
}: DetailsStepProps) => {
  const valueOf = (field: DetailsField) =>
    target && field === "artists"
      ? target.artists.join(", ")
      : target && field === "title"
        ? target.title
        : details[field];

  return (
    <Stack
      component="form"
      aria-labelledby="details-step-title"
      gap="lg"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <StepTitle id="details-step-title" title="Sprawdź dane" />

      {existingProducts.length > 0 && (
        <ExistingProductsAlert matches={existingProducts} destination={destination} onChange={onDestination} />
      )}

      {/* Wariant istniejącej płyty: artysta i tytuł należą do niej, więc są zwykłym tekstem. Tłoczenie jest w kroku wariantu. */}
      {target ? (
        <Stack component="dl" gap={0} m={0}>
          {TEXT_FIELDS.map(({ field, label }) => (
            <ReadOnlyValue key={field} label={label} value={valueOf(field)} />
          ))}
        </Stack>
      ) : (
        TEXT_FIELDS.map(({ field, label }) => (
          <TextInput
            key={field}
            size="lg"
            label={
              <Group gap="xs" component="span">
                {label}
                <FromLabelHint show={fromLabel[field]} />
              </Group>
            }
            value={details[field]}
            onChange={(event) => onChange({ [field]: event.currentTarget.value })}
          />
        ))
      )}

      {details.discogsReleaseId && (
        <Text fz="sm" c="dimmed">
          Z Discogs: {details.tracklistCount} utworów, {details.previewLinksCount} linków do odsłuchu. Data provided by
          Discogs.{" "}
          <ExternalLink href={`https://www.discogs.com/release/${details.discogsReleaseId}`} inherit>
            Zobacz wydanie
          </ExternalLink>
        </Text>
      )}

      <Button type="submit" size="xl" fullWidth rightSection={<IconArrowRight size={26} aria-hidden="true" />}>
        Dalej: wariant
      </Button>
    </Stack>
  );
};

export default DetailsStep;
