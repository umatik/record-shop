import { Badge, Group } from "@mantine/core";
import { draftHints } from "@/lib/format";
import type { Product } from "@/types/product";

type DraftBadgesProps = {
  product: Product;
};

/** Czego brakuje szkicowi do publikacji albo „gotowa do publikacji”. */
const DraftBadges = ({ product }: DraftBadgesProps) => {
  const hints = draftHints(product);

  return (
    <Group gap={8} mt={8}>
      {hints.length === 0 ? (
        <Badge color="success" variant="light" size="xl" fz="sm" fw={600}>
          gotowa do publikacji
        </Badge>
      ) : (
        hints.map((hint) => (
          <Badge key={hint} color="warning" variant="light" size="xl" fz="sm" fw={600}>
            {hint}
          </Badge>
        ))
      )}
    </Group>
  );
};

export default DraftBadges;
