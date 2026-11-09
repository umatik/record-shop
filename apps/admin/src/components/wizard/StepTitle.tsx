import { Stack, Text, Title } from "@mantine/core";

type StepTitleProps = {
  id: string;
  title: string;
  description?: string;
};

/** Nagłówek kroku kreatora; `id` łączy go z sekcją przez `aria-labelledby`. */
const StepTitle = ({ id, title, description }: StepTitleProps) => (
  <Stack gap={4}>
    <Title id={id} order={1}>
      {title}
    </Title>
    {description && (
      <Text c="dimmed" fz="lg">
        {description}
      </Text>
    )}
  </Stack>
);

export default StepTitle;
