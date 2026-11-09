"use client";

import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import ProductPhoto from "./ProductPhoto";
import { IconAlertCircle, IconWorldUpload } from "@tabler/icons-react";
import ErrorState from "@/components/ui/ErrorState";
import { useSetPublished } from "@/hooks/useProduct";
import ExternalLink from "@/components/ui/ExternalLink";
import { discogsUrl, productArtist } from "@/lib/format";
import { describeWarning } from "@/lib/warnings";
import type { Product, PublishWarning } from "@/types/product";

type ProductHeaderProps = {
  product: Product;
  warnings: PublishWarning[];
};

/** Nagłówek produktu: płyta, ostrzeżenia i (dla szkicu) publikacja. */
const ProductHeader = ({ product, warnings }: ProductHeaderProps) => {
  const setPublished = useSetPublished(product.id);
  const discogs = discogsUrl(product);

  return (
    <Stack component="header" gap="sm">
      <Group wrap="nowrap" align="flex-start" gap="md">
        {/* Główne zdjęcie płyty przed tytułem; dotknięcie je podmienia. */}
        <ProductPhoto product={product} />
        <div style={{ minWidth: 0 }}>
          <Title id="product-title" order={1}>
            {productArtist(product) || product.title}
          </Title>
          <Text c="dimmed" fz="lg">
            {product.title}
          </Text>
          {discogs && (
            <ExternalLink href={discogs} fz="md">
              Zobacz na Discogs
            </ExternalLink>
          )}
        </div>
      </Group>

      {warnings.map((warning) => (
        <Alert
          key={warning}
          color="yellow"
          variant="light"
          fz="md"
          icon={<IconAlertCircle size={24} aria-hidden="true" />}
        >
          {describeWarning(warning)}
        </Alert>
      ))}
      {setPublished.isError && <ErrorState message={setPublished.error.message} />}

      {/* Szkic: publikacja to główna akcja. Wycofanie ze sprzedaży jest w sekcji „Ustawienia”. */}
      {!product.isPublished && (
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
