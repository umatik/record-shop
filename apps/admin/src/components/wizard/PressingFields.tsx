import { Group, Stack, TextInput } from "@mantine/core";
import ChoiceField from "./ChoiceField";
import type { DetailsField, FromLabel, RecordDetails } from "./details";
import FromLabelHint from "./FromLabelHint";

type PressingFieldsProps = {
  details: RecordDetails;
  onChange: (patch: Partial<RecordDetails>) => void;
  fromLabel: FromLabel;
};

const TEXT_FIELDS: { field: DetailsField; label: string; numeric?: boolean }[] = [
  { field: "label", label: "Wytwórnia" },
  { field: "catalogNumber", label: "Numer katalogowy" },
  { field: "year", label: "Rok", numeric: true },
];

const FORMATS = ["LP", '12"', '10"', '7"'].map((format) => ({ value: format, label: format }));
const SPEEDS = [
  { value: "33", label: "33 RPM" },
  { value: "45", label: "45 RPM" },
];

/**
 * Tłoczenie (wytwórnia, numer katalogowy, rok, format, prędkość). Należy do wariantu, nie do płyty:
 * jedna płyta może mieć wiele wydań, więc te pola są w kroku wariantu, także przy dodawaniu do istniejącej płyty.
 */
const PressingFields = ({ details, onChange, fromLabel }: PressingFieldsProps) => (
  <Stack gap="lg">
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
        value={details[field]}
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
  </Stack>
);

export default PressingFields;
