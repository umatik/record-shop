import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import type { ProductMatch } from "@/types/lookup";
import ChoiceField from "./ChoiceField";
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

const TEXT_FIELDS: { field: DetailsField; label: string; numeric?: boolean }[] = [
  { field: "artists", label: "Artysta" },
  { field: "title", label: "Tytuł" },
  { field: "label", label: "Wytwórnia" },
  { field: "catalogNumber", label: "Numer katalogowy" },
  { field: "year", label: "Rok", numeric: true },
];

const FORMATS = ["LP", '12"', '10"', '7"'].map((format) => ({ value: format, label: format }));
const SPEEDS = [
  { value: "33", label: "33 RPM" },
  { value: "45", label: "45 RPM" },
];

/** Krok 3: sprawdzenie i poprawa danych płyty, z ostrzeżeniem o płytach, które już są w sklepie. */
const DetailsStep = ({
  details,
  onChange,
  fromLabel,
  existingProducts,
  target,
  destination,
  onDestination,
  onNext,
}: DetailsStepProps) => (
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

    {TEXT_FIELDS.map(({ field, label, numeric }) => (
      <TextInput
        key={field}
        size="lg"
        label={
          <Group gap="xs" component="span">
            {label}
            <FromLabelHint show={fromLabel[field]} />
          </Group>
        }
        readOnly={Boolean(target) && (field === "artists" || field === "title")}
        value={
          target && field === "artists"
            ? target.artists.join(", ")
            : target && field === "title"
              ? target.title
              : details[field]
        }
        onChange={(event) => onChange({ [field]: event.currentTarget.value })}
        {...(numeric && { inputMode: "numeric" as const })}
      />
    ))}

    <ChoiceField
      legend="Format"
      value={details.format}
      onChange={(format) => onChange({ format: format as RecordDetails["format"] })}
      options={FORMATS}
      fromLabel={fromLabel.format}
    />
    <ChoiceField
      legend="Prędkość"
      value={details.speed}
      onChange={(speed) => onChange({ speed: speed as RecordDetails["speed"] })}
      options={SPEEDS}
      fromLabel={fromLabel.speed}
    />

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
      Dalej: stan i cena
    </Button>
  </Stack>
);

export default DetailsStep;
