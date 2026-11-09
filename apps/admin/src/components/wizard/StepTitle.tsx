import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type StepTitleProps = {
  id: string;
  title: string;
  description?: string;
  /** Akcja po prawej stronie tytułu, np. ponowne wyszukanie. */
  aside?: ReactNode;
};

/** Nagłówek kroku kreatora; `id` łączy go z sekcją przez `aria-labelledby`. */
const StepTitle = ({ id, title, description, aside }: StepTitleProps) => (
  <Stack gap={4}>
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Title id={id} order={1}>
        {title}
      </Title>
      {aside}
    </Group>
    {description && (
      <Text c="dimmed" fz="lg">
        {description}
      </Text>
    )}
  </Stack>
);

export default StepTitle;
