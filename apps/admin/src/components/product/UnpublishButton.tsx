"use client";

import { Button, Stack } from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";
import ErrorState from "@/components/ui/ErrorState";
import { useSetPublished } from "@/hooks/useProduct";
import type { Product } from "@/types/product";

/** Wycofanie płyty ze sprzedaży: wraca do szkiców, dane i warianty zostają. */
const UnpublishButton = ({ product }: { product: Product }) => {
  const setPublished = useSetPublished(product.id);

  return (
    <Stack gap="sm">
      {setPublished.isError && <ErrorState message={setPublished.error.message} />}
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
    </Stack>
  );
};

export default UnpublishButton;
