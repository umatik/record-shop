import { Group, Text, Title } from "@mantine/core";

type PageTitleProps = {
  id?: string;
  title: string;
  /** Krótki dopisek po prawej, np. liczba pozycji. */
  aside?: string | undefined;
  order?: 1 | 2;
};

/** Tytuł strony albo sekcji z licznikiem w jednej linii (zawija się na wąskim ekranie). */
const PageTitle = ({ id, title, aside, order = 1 }: PageTitleProps) => (
  <Group justify="space-between" align="baseline" gap="xs">
    <Title id={id} order={order}>
      {title}
    </Title>
    {aside && (
      <Text c="dimmed" fz={order === 1 ? "lg" : "md"}>
        {aside}
      </Text>
    )}
  </Group>
);

export default PageTitle;
