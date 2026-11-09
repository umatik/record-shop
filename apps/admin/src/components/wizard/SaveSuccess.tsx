import { Alert, Button, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import type { CreateRecordResult } from "@/hooks/useCreateRecord";
import { describeWarning } from "@/lib/warnings";

type SaveSuccessProps = {
  result: CreateRecordResult;
  recordName: string;
  onAddAnother: () => void;
};

/** Ekran po zapisie: potwierdzenie, ostrzeżenia z publikacji i co dalej. */
const SaveSuccess = ({ result, recordName, onAddAnother }: SaveSuccessProps) => (
  <Stack component="section" aria-labelledby="save-success-title" gap="lg">
    <Stack align="center" gap="xs" py="md" role="status">
      <ThemeIcon size={88} radius={100} variant="outline" color="green" style={{ borderWidth: 3 }} aria-hidden="true">
        <IconCheck size={52} stroke={2.5} />
      </ThemeIcon>
      <Title id="save-success-title" order={1} ta="center">
        {result.addedVariant ? "Dodano wariant" : result.published ? "Płyta jest w sprzedaży" : "Zapisano szkic"}
      </Title>
      <Text fz="lg" ta="center">
        {recordName}
      </Text>
    </Stack>
    {result.warnings.map((warning) => (
      <Alert key={warning} color="yellow" variant="light" fz="md">
        {describeWarning(warning)}
      </Alert>
    ))}
    {result.failedPhotos > 0 && (
      <Alert color="red" variant="light" fz="md">
        Nie udało się wgrać {result.failedPhotos} zdjęć. Dodasz je przy edycji płyty.
      </Alert>
    )}
    <Button size="xl" fullWidth leftSection={<IconPlus size={26} aria-hidden="true" />} onClick={onAddAnother}>
      Dodaj kolejną płytę
    </Button>
    <Button component={Link} href={`/produkty/${result.productId}`} size="lg" variant="default" fullWidth>
      Zobacz produkt
    </Button>
    {!result.addedVariant && (
      <Button component={Link} href={result.published ? "/produkty" : "/szkice"} size="lg" variant="default" fullWidth>
        {result.published ? "Zobacz produkty" : "Zobacz szkice"}
      </Button>
    )}
  </Stack>
);

export default SaveSuccess;
