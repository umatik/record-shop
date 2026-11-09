import { Button, SimpleGrid, Text } from "@mantine/core";
import type { Grade } from "./condition";

type GradePickerProps<T extends string> = {
  legend: string;
  grades: readonly Grade<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
};

/** Ile ocen mieści się w rzędzie; dłuższe opcje okładki („Okładka firmowa”) idą po dwie. */
const SHORT_GRADES = 8;

type GradeButtonProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

const GradeButton = ({ label, selected, onClick }: GradeButtonProps) => (
  <Button size="lg" px={4} variant={selected ? "filled" : "default"} onClick={onClick} aria-pressed={selected}>
    {label}
  </Button>
);

/** Wybór oceny w skali Goldmine jako grupa przycisków z legendą i opisem wybranej oceny. */
const GradePicker = <T extends string>({ legend, grades, value, onChange, error }: GradePickerProps<T>) => {
  const selected = grades.find((grade) => grade.code === value);
  const renderGrade = (grade: Grade<T>) => (
    <GradeButton
      key={grade.code}
      label={grade.label}
      selected={grade.code === value}
      onClick={() => onChange(grade.code)}
    />
  );

  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <Text component="legend" fw={800} fz="xxl" mb="xs" p={0}>
        {legend}
      </Text>
      <SimpleGrid cols={4} spacing="xs">
        {grades.slice(0, SHORT_GRADES).map(renderGrade)}
      </SimpleGrid>
      {grades.length > SHORT_GRADES && (
        <SimpleGrid cols={2} spacing="xs" mt="xs">
          {grades.slice(SHORT_GRADES).map(renderGrade)}
        </SimpleGrid>
      )}
      {selected && (
        <Text fz="lg" mt="xs" aria-live="polite">
          {selected.description}
        </Text>
      )}
      {error && (
        <Text role="alert" c="red" fz="md" mt="xs">
          {error}
        </Text>
      )}
    </fieldset>
  );
};

export default GradePicker;
