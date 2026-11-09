import { Anchor, Divider, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconDisc } from "@tabler/icons-react";
import Link from "next/link";
import ErrorState from "@/components/ui/ErrorState";
import { pluralize } from "@/lib/format";

type StockBarProps = {
  /** Sztuki i presy na stanie w opublikowanych płytach; `undefined` w trakcie ładowania. */
  stock: { copies: number; presses: number } | undefined;
  error?: Error | null;
  onRetry: () => void;
};

/** Zwięzły pasek stanu magazynu. Link otwiera katalog zawężony do tego samego zbioru: płyt na stanie. */
const StockBar = ({ stock, error, onRetry }: StockBarProps) => (
  <Stack component="section" aria-label="Stan magazynu" gap="md">
    <Divider />
    {error ? (
      <ErrorState message={error.message} onRetry={onRetry} />
    ) : !stock ? (
      <Skeleton h={28} aria-hidden="true" />
    ) : (
      <Group gap="md" fz="xs">
        <Group gap={6} wrap="nowrap">
          <IconDisc size={18} aria-hidden="true" />
          <Text fz="xs">
            <Text span fw={700} inherit>
              {stock.copies}
            </Text>{" "}
            {pluralize(stock.copies, ["sztuka", "sztuki", "sztuk"])} na stanie
          </Text>
        </Group>
        <Text fz="xs" c="dimmed">
          {stock.presses} {pluralize(stock.presses, ["wydanie", "wydania", "wydań"])}
        </Text>
        <Anchor component={Link} href="/produkty?dostepne=1" fz="sm" fw={600} ml="auto">
          <Group component="span" gap={6} wrap="nowrap">
            Produkty
            <IconArrowRight size={18} aria-hidden="true" />
          </Group>
        </Anchor>
      </Group>
    )}
  </Stack>
);

export default StockBar;
