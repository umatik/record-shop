"use client";

import { Button, Paper, Stack, Text, Textarea, Title } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslateNote } from "@/hooks/useLookup";
import type { TranslatedNote } from "@/types/lookup";

type ConditionNoteFieldProps = {
  note: string;
  translation: TranslatedNote | null;
  onNoteChange: (note: string) => void;
  onTranslationChange: (translation: TranslatedNote | null) => void;
  error?: string | null;
};

/**
 * Notatka o stanie po polsku z tłumaczeniem na EN i ES do sprawdzenia i poprawki (nic nie zapisujemy w ciemno).
 * Gdy Claude nie działa, pola tłumaczenia otwierają się puste do wpisania ręcznie.
 */
const ConditionNoteField = ({
  note,
  translation,
  onNoteChange,
  onTranslationChange,
  error,
}: ConditionNoteFieldProps) => {
  const translate = useTranslateNote();
  const text = note.trim();
  const translationIsCurrent = translation !== null && translation.pl === text;

  const run = () =>
    translate.mutate(text, {
      onSuccess: (result) => onTranslationChange({ ...result, pl: text }),
      onError: () => onTranslationChange({ pl: text, en: translation?.en ?? "", es: translation?.es ?? "" }),
    });

  return (
    <Stack component="section" aria-labelledby="note-title" gap="xs">
      <Title id="note-title" order={2}>
        Notatka o stanie
      </Title>
      <Textarea
        size="lg"
        autosize
        minRows={3}
        maxLength={1000}
        aria-labelledby="note-title"
        placeholder="Lekki trzask na stronie B, okładka z przetarciem"
        description="Po polsku. Klient zobaczy ją po angielsku albo hiszpańsku."
        value={note}
        onChange={(event) => onNoteChange(event.currentTarget.value)}
      />
      {text && !translationIsCurrent && (
        <Button
          size="lg"
          variant="light"
          leftSection={<IconLanguage size={24} aria-hidden="true" />}
          loading={translate.isPending}
          onClick={run}
        >
          {translation ? "Przetłumacz ponownie" : "Przetłumacz (EN, ES)"}
        </Button>
      )}
      {translate.isError && (
        <ErrorState message={`${translate.error.message} Wpisz tłumaczenie poniżej sam albo usuń notatkę.`} />
      )}
      {translationIsCurrent && (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text fw={700} fz="lg">
              Sprawdź tłumaczenie
            </Text>
            <Textarea
              size="lg"
              autosize
              label="Angielski"
              value={translation.en}
              onChange={(event) => onTranslationChange({ ...translation, en: event.currentTarget.value })}
            />
            <Textarea
              size="lg"
              autosize
              label="Hiszpański"
              value={translation.es}
              onChange={(event) => onTranslationChange({ ...translation, es: event.currentTarget.value })}
            />
          </Stack>
        </Paper>
      )}
      {error && (
        <Text role="alert" c="red" fz="md">
          {error}
        </Text>
      )}
    </Stack>
  );
};

export default ConditionNoteField;
