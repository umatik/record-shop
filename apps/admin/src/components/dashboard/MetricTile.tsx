import { Group, Skeleton, Text, UnstyledButton } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  icon: Icon;
  /** Wartość do pokazania; `undefined` w trakcie ładowania. */
  value: ReactNode | undefined;
  /** Dopisek pod wartością. */
  note?: ReactNode;
  /** Kolor dopisku (np. długie oczekiwanie na czerwono); domyślnie przygaszony. */
  noteColor?: string;
  /** Zapytanie się nie powiodło: zamiast liczby kreska, żeby błąd nie wyglądał jak zero. */
  failed?: boolean;
  /** Kafelek jest linkiem (`href`) albo przyciskiem przewijającym do sekcji (`onClick`). */
  href?: string;
  onClick?: () => void;
};

/** Kafelek podsumowania na pulpicie: etykieta z ikoną, duża liczba i dopisek. Cały jest klikalny. */
const MetricTile = ({
  label,
  icon: TileIcon,
  value,
  note,
  noteColor = "dimmed",
  failed,
  href,
  onClick,
}: MetricTileProps) => {
  const content = (
    <>
      <Group component="span" justify="space-between" align="flex-start" gap={8} wrap="nowrap" w="100%">
        <Text component="span" c="dimmed" fz={{ base: "xs", sm: "sm" }} lh={1.3}>
          {label}
        </Text>
        <TileIcon size={18} color="var(--mantine-color-dimmed)" aria-hidden="true" style={{ flexShrink: 0 }} />
      </Group>
      {failed ? (
        <>
          <Text component="span" fz={{ base: "xl", sm: "h1" }} fw={800} lh={1.25} aria-hidden="true">
            —
          </Text>
          <Text component="span" fz="xs" c="danger.8">
            Nie udało się pobrać
          </Text>
        </>
      ) : value === undefined ? (
        <Skeleton h={58} aria-hidden="true" />
      ) : (
        <>
          <Text component="span" fz={{ base: "xl", sm: "h1" }} fw={800} lh={1.25} className="tabular">
            {value}
          </Text>
          <Text component="span" fz="xs" c={noteColor} lh={1.3}>
            {note}
          </Text>
        </>
      )}
    </>
  );

  const props = { className: "dashboard-tile", p: { base: "sm", sm: "md" } };

  return href ? (
    <UnstyledButton component={Link} href={href} {...props}>
      {content}
    </UnstyledButton>
  ) : (
    <UnstyledButton onClick={onClick} {...props}>
      {content}
    </UnstyledButton>
  );
};

export default MetricTile;
