import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";
import RecordThumb from "./RecordThumb";

type ListRowProps = {
  href: string;
  thumb: string | null | undefined;
  /** Pierwszy wiersz, pogrubiony (artysta, kupujący). */
  title: string;
  /** Drugi wiersz (tytuł płyty). */
  subtitle?: ReactNode;
  /** Pod spodem: plakietki, informacja o czasie. */
  extra?: ReactNode;
  /** Prawa kolumna: cena, strzałka. */
  aside?: ReactNode;
};

/**
 * Wiersz listy (płyty, zamówienia): miniatura, dwa wiersze tekstu, prawa kolumna. Cały wiersz jest linkiem.
 * Duży tekst zawija się do dwóch linii zamiast ucinać nazwiska.
 */
const ListRow = ({ href, thumb, title, subtitle, extra, aside }: ListRowProps) => (
  <UnstyledButton component={Link} href={href} display="block" w="100%" py="lg">
    <Group wrap="nowrap" gap="md" align="center">
      <RecordThumb src={thumb} />
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Text fw={700} fz="xxl" lh={1.25} lineClamp={2}>
          {title}
        </Text>
        {subtitle && (
          <Text c="dimmed" fz="lg" lh={1.35} lineClamp={2}>
            {subtitle}
          </Text>
        )}
        {extra}
      </Stack>
      {aside}
    </Group>
  </UnstyledButton>
);

export default ListRow;
