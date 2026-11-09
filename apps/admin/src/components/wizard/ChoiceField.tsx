import { Group, SegmentedControl, Text } from "@mantine/core";
import FromLabelHint from "./FromLabelHint";

type ChoiceFieldProps = {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  fromLabel?: boolean;
};

/** Wybór jednej z kilku opcji (format, prędkość) jako grupa pól z legendą. */
const ChoiceField = ({ legend, value, onChange, options, fromLabel }: ChoiceFieldProps) => (
  <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
    <Group component="legend" gap="xs" mb={6} p={0}>
      <Text component="span" fw={500} fz="md">
        {legend}
      </Text>
      <FromLabelHint show={fromLabel} />
    </Group>
    <SegmentedControl fullWidth size="lg" value={value} onChange={onChange} data={options} />
  </fieldset>
);

export default ChoiceField;
