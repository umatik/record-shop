import { Button, Group, Text } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { count } from "@/lib/format";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

/** Liczba sztuk dużymi przyciskami − i +, co najmniej 1. */
const QuantityStepper = ({ value, onChange }: QuantityStepperProps) => (
  <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
    <Text component="legend" fw={800} fz="xxl" mb="xs" p={0}>
      Ilość
    </Text>
    <Group gap="md" wrap="nowrap">
      <Button size="xl" variant="default" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Mniej sztuk">
        <IconMinus size={26} aria-hidden="true" />
      </Button>
      <Text component="output" fz="xxl" fw={700} w={64} ta="center" aria-live="polite">
        {value}
      </Text>
      <Button size="xl" variant="default" onClick={() => onChange(value + 1)} aria-label="Więcej sztuk">
        <IconPlus size={26} aria-hidden="true" />
      </Button>
      <Text c="dimmed" fz="lg" aria-hidden="true">
        {count(value, ["sztuka", "sztuki", "sztuk"]).replace(/^\d+ /, "")}
      </Text>
    </Group>
  </fieldset>
);

export default QuantityStepper;
