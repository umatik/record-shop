import { Button, Progress, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";

type WizardHeaderProps = {
  step: number;
  stepCount: number;
  /** Bez funkcji przycisk się nie pokazuje. */
  onBack?: (() => void) | undefined;
  onForward?: (() => void) | undefined;
};

/** Nawigacja kreatora: Wstecz, licznik kroków na środku, Dalej do kroków już wypełnionych, pasek postępu. */
const WizardHeader = ({ step, stepCount, onBack, onForward }: WizardHeaderProps) => (
  <Stack component="nav" aria-label="Kroki kreatora" gap={6}>
    {/* Trzy kolumny o równych bokach, żeby licznik kroków był zawsze na środku. */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", minHeight: 44 }}>
      <div>
        {onBack && (
          <Button
            variant="subtle"
            size="lg"
            px={0}
            leftSection={<IconArrowLeft size={24} aria-hidden="true" />}
            onClick={onBack}
          >
            Wstecz
          </Button>
        )}
      </div>
      <Text fz="lg" c="dimmed" ta="center" aria-current="step">
        Krok {step} z {stepCount}
      </Text>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {onForward && (
          <Button
            variant="subtle"
            size="lg"
            px={0}
            rightSection={<IconArrowRight size={24} aria-hidden="true" />}
            onClick={onForward}
          >
            Dalej
          </Button>
        )}
      </div>
    </div>
    <Progress
      color="camoOlive"
      value={(step / stepCount) * 100}
      size="md"
      radius="xl"
      aria-label={`Postęp: krok ${step} z ${stepCount}`}
    />
  </Stack>
);

export default WizardHeader;
