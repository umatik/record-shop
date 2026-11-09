"use client";

import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconEyeOff, IconWorldUpload } from "@tabler/icons-react";
import ErrorState from "@/components/ui/ErrorState";
import { useSetPublished } from "@/hooks/useProduct";
import { productArtist } from "@/lib/format";
import { describeWarning } from "@/lib/warnings";
import type { Product, PublishWarning } from "@/types/product";

type ProductHeaderProps = {
  product: Product;
  warnings: PublishWarning[];
};

/** Nagłówek produktu: płyta, status, ostrzeżenia i publikacja albo wycofanie ze sprzedaży. */
const ProductHeader = ({ product, warnings }: ProductHeaderProps) => {
  const setPublished = useSetPublished(product.id);

  return (
    <Stack component="header" gap="sm">
      <div>
        <Title id="product-title" order={1}>
          {productArtist(product) || product.title}
        </Title>
        <Text c="dimmed" fz="lg">
          {product.title}
        </Text>
      </div>
      <Group gap="xs">
        <Badge color={product.isPublished ? "green" : "yellow"} variant="light" size="xl" fz="sm" fw={600}>
          {product.isPublished ? "W sprzedaży" : "Szkic"}
        </Badge>
      </Group>

      {warnings.map((warning) => (
        <Alert key={warning} color="yellow" variant="light" fz="md">
          {describeWarning(warning)}
        </Alert>
      ))}
      {setPublished.isError && <ErrorState message={setPublished.error.message} />}

      {product.isPublished ? (
        <Button
          size="lg"
          variant="default"
          fullWidth
          leftSection={<IconEyeOff size={24} aria-hidden="true" />}
          loading={setPublished.isPending}
          onClick={() => setPublished.mutate(false)}
        >
          Wycofaj ze sprzedaży
        </Button>
      ) : (
        <Button
          size="xl"
          fullWidth
          leftSection={<IconWorldUpload size={26} aria-hidden="true" />}
          loading={setPublished.isPending}
          onClick={() => setPublished.mutate(true)}
        >
          Opublikuj
        </Button>
      )}
    </Stack>
  );
};

export default ProductHeader;
