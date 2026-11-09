"use client";

import { Alert, Button, List, Stack } from "@mantine/core";
import { IconDeviceFloppy, IconWorldUpload } from "@tabler/icons-react";
import { useState } from "react";
import { useCreateRecord, type CreateRecordResult } from "@/hooks/useCreateRecord";
import { ApiError } from "@/services/http";
import type { VariantInput } from "./condition";
import type { RecordDetails } from "./details";
import { buildProductInput } from "./recordInput";
import RecordSummary from "./RecordSummary";
import SaveSuccess from "./SaveSuccess";
import StepTitle from "./StepTitle";

type SummaryStepProps = {
  details: RecordDetails;
  variant: VariantInput;
  photoUploadIds: string[];
  labelPhotos: File[];
  extraPhotos: File[];
  onSaved: () => void;
  onAddAnother: () => void;
};

/**
 * Krok 6: podsumowanie i zapis (szkic albo publikacja). Ostrzeżenia z publikacji pokazujemy, ale nie blokują.
 */
const SummaryStep = ({
  details,
  variant,
  photoUploadIds,
  labelPhotos,
  extraPhotos,
  onSaved,
  onAddAnother,
}: SummaryStepProps) => {
  const createRecord = useCreateRecord();
  const [result, setResult] = useState<CreateRecordResult | null>(null);
  const [publishing, setPublishing] = useState(false);

  const save = (publish: boolean) => {
    setPublishing(publish);
    createRecord.mutate(
      { product: buildProductInput(details, variant, photoUploadIds), extraPhotos, publish },
      {
        onSuccess: (saved) => {
          setResult(saved);
          onSaved();
        },
      },
    );
  };

  if (result) {
    return (
      <SaveSuccess result={result} recordName={`${details.artists} – ${details.title}`} onAddAnother={onAddAnother} />
    );
  }

  const error = createRecord.error;

  return (
    <Stack component="section" aria-labelledby="summary-step-title" gap="lg">
      <StepTitle id="summary-step-title" title="Podsumowanie" />

      <RecordSummary
        details={details}
        variant={variant}
        cover={labelPhotos[0] ?? extraPhotos[0]}
        photoCount={photoUploadIds.length + extraPhotos.length}
      />

      {error && (
        <Alert color="red" variant="light" title={error.message} fz="md">
          {error instanceof ApiError && error.errors.length > 0 && (
            <List fz="md">
              {error.errors.map((item) => (
                <List.Item key={item.path}>
                  {item.path}: {item.message}
                </List.Item>
              ))}
            </List>
          )}
        </Alert>
      )}

      <Button
        size="xl"
        fullWidth
        leftSection={<IconWorldUpload size={26} aria-hidden="true" />}
        loading={createRecord.isPending && publishing}
        disabled={createRecord.isPending && !publishing}
        onClick={() => save(true)}
      >
        Opublikuj
      </Button>
      <Button
        size="lg"
        variant="default"
        fullWidth
        leftSection={<IconDeviceFloppy size={24} aria-hidden="true" />}
        loading={createRecord.isPending && !publishing}
        disabled={createRecord.isPending && publishing}
        onClick={() => save(false)}
      >
        Zapisz jako szkic
      </Button>
    </Stack>
  );
};

export default SummaryStep;
