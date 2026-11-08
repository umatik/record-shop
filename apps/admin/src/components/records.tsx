"use client";

import { Avatar, Badge, Divider, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconDisc } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { draftHints, formatEur, lowestPrice, primaryPhoto, productArtist } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Wiersz płyty: okładka, artysta pogrubiony, tytuł, pod spodem plakietki, po prawej cena albo strzałka
 * w osobnej kolumnie. Duży tekst zawija się do dwóch linii zamiast ucinać nazwiska.
 */
export function RecordRow({
  product,
  href,
  badges,
  right,
}: {
  product: Product;
  href: string;
  badges?: ReactNode;
  right: ReactNode;
}) {
  return (
    <UnstyledButton component={Link} href={href} display="block" w="100%" py={24}>
      <Group wrap="nowrap" gap="md" align="center">
        <Avatar src={primaryPhoto(product)} radius="sm" size={91} alt="" style={{ alignSelf: "flex-start" }}>
          <IconDisc size={38} />
        </Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} fz={24} lh={1.25} lineClamp={2}>
            {productArtist(product) || product.title}
          </Text>
          <Text c="dimmed" fz={20} lh={1.35} lineClamp={2}>
            {product.title}
          </Text>
          {badges && (
            <Group gap={8} mt={8}>
              {badges}
            </Group>
          )}
        </Stack>
        {right}
      </Group>
    </UnstyledButton>
  );
}

/** Plakietki szkicu: czego brakuje do publikacji albo „gotowa do publikacji”. */
export function DraftBadges({ product }: { product: Product }) {
  const hints = draftHints(product);
  if (hints.length === 0) {
    return (
      <Badge color="green" variant="light" size="xl" fz="md" fw={600}>
        gotowa do publikacji
      </Badge>
    );
  }
  return hints.map((hint) => (
    <Badge key={hint} color="yellow" variant="light" size="xl" fz="md" fw={600}>
      {hint}
    </Badge>
  ));
}

/** Najniższa cena płyty (przy kilku wariantach). */
export function Price({ product }: { product: Product }) {
  const price = lowestPrice(product);
  if (price === undefined) return null;
  return (
    <Text fw={700} fz={22} style={{ whiteSpace: "nowrap" }}>
      {formatEur(price)}
    </Text>
  );
}

/** Lista wierszy rozdzielonych cienką linią. */
export function RecordRows({ products, renderRow }: { products: Product[]; renderRow: (product: Product) => ReactNode }) {
  return (
    <Stack gap={0}>
      {products.map((product, index) => (
        <div key={product.id}>
          {index > 0 && <Divider />}
          {renderRow(product)}
        </div>
      ))}
    </Stack>
  );
}
