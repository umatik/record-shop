"use client";

import { Button, Stack } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useState } from "react";
import { MEDIA_GRADES, SLEEVE_GRADES } from "@/lib/vinyl";
import { conditionErrors, toVariant, type ConditionForm } from "./condition";
import ConditionNoteField from "./ConditionNoteField";
import GradePicker from "@/components/fields/GradePicker";
import PriceField from "@/components/fields/PriceField";
import QuantityStepper from "@/components/fields/QuantityStepper";
import StepTitle from "./StepTitle";

type ConditionStepProps = {
  form: ConditionForm;
  onChange: (patch: Partial<ConditionForm>) => void;
  onNext: () => void;
};

/** Krok 4: stan płyty i okładki w skali Goldmine, cena w euro, ilość i notatka o stanie. */
const ConditionStep = ({ form, onChange, onNext }: ConditionStepProps) => {
  const [showErrors, setShowErrors] = useState(false);
  const errors = conditionErrors(form);
  const shown = (message: string | null) => (showErrors ? message : null);

  return (
    <Stack
      component="form"
      aria-labelledby="condition-step-title"
      gap="xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (toVariant(form)) onNext();
        else setShowErrors(true);
      }}
    >
      <StepTitle id="condition-step-title" title="Stan i cena" />

      <GradePicker
        legend="Stan płyty"
        grades={MEDIA_GRADES}
        value={form.media}
        onChange={(media) => onChange({ media })}
        error={shown(errors.media)}
      />
      <GradePicker
        legend="Stan okładki"
        grades={SLEEVE_GRADES}
        value={form.sleeve}
        onChange={(sleeve) => onChange({ sleeve })}
        error={shown(errors.sleeve)}
      />
      <PriceField value={form.price} onChange={(price) => onChange({ price })} error={shown(errors.price)} />
      <QuantityStepper value={form.quantity} onChange={(quantity) => onChange({ quantity })} />
      <ConditionNoteField
        note={form.note}
        translation={form.translation}
        onNoteChange={(note) => onChange({ note })}
        onTranslationChange={(translation) => onChange({ translation })}
        error={shown(errors.note)}
      />

      <Button type="submit" size="xl" fullWidth rightSection={<IconArrowRight size={26} aria-hidden="true" />}>
        Dalej: zdjęcia
      </Button>
    </Stack>
  );
};

export default ConditionStep;
