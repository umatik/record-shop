import { Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronRight, IconChevronUp, type Icon } from "@tabler/icons-react";
import Link from "next/link";

type AttentionRowProps = {
  icon: Icon;
  /** Kolor kółka z ikoną: `warning` dla oczekiwania, `success` dla gotowych. */
  color: string;
  title: string;
  description: string;
  /** Wiersz prowadzi do innej strony… */
  href?: string;
  /** …albo rozwija listę pod sobą; `expanded` mówi, czy jest rozwinięta. */
  onToggle?: () => void;
  expanded?: boolean;
  /** `id` rozwijanej listy, dla `aria-controls`. */
  controls?: string;
};

/** Wiersz sekcji „Wymaga uwagi”: ikona w kółku, dwa wiersze tekstu i strzałka. */
const AttentionRow = ({
  icon: RowIcon,
  color,
  title,
  description,
  href,
  onToggle,
  expanded,
  controls,
}: AttentionRowProps) => {
  const Chevron = href ? IconChevronRight : expanded ? IconChevronUp : IconChevronDown;
  const content = (
    <Group wrap="nowrap" gap="sm">
      <ThemeIcon size={40} radius="xl" variant="light" color={color} aria-hidden="true">
        <RowIcon size={20} />
      </ThemeIcon>
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text fz="sm" fw={600} lh={1.3}>
          {title}
        </Text>
        <Text fz="xs" c="dimmed" lh={1.3}>
          {description}
        </Text>
      </Stack>
      <Chevron size={22} color="var(--mantine-color-dimmed)" aria-hidden="true" style={{ flexShrink: 0 }} />
    </Group>
  );

  const props = { display: "block", w: "100%", py: "sm", className: "dashboard-row" };

  return href ? (
    <UnstyledButton component={Link} href={href} {...props}>
      {content}
    </UnstyledButton>
  ) : (
    <UnstyledButton onClick={onToggle} aria-expanded={expanded} aria-controls={controls} {...props}>
      {content}
    </UnstyledButton>
  );
};

export default AttentionRow;
