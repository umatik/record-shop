"use client";

import { Button, Group, Skeleton, Stack, Text, TextInput, Title } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { count } from "@/lib/format";
import type { ProductList } from "@/lib/types";
import { DraftBadges, Price, RecordRow, RecordRows } from "./records";

const PAGE_SIZE = 20;

/**
 * Lista płyt jednego statusu z wyszukiwaniem i przyciskiem „Pokaż więcej” (wygodniej kciukiem niż paginacja).
 * Produkty: opublikowane z ceną. Szkice: niedokończone, z podpowiedzią, czego brakuje.
 */
export function ProductsList({ status }: { status: "published" | "draft" }) {
  const isDraft = status === "draft";
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search.trim(), 300);

  const products = useInfiniteQuery({
    queryKey: ["products", "list", status, q],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ status, sort: "newest", page: String(pageParam), limit: String(PAGE_SIZE) });
      if (q) params.set("q", q);
      return api<ProductList>(`/products/manage?${params}`);
    },
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });

  const items = products.data?.pages.flatMap((page) => page.products) ?? [];
  const total = products.data?.pages[0]?.pagination.total;

  return (
    <Stack gap="lg" maw={640} mx="auto">
      <Group justify="space-between" align="baseline" gap="xs">
        <Title order={1} fz={32}>
          {isDraft ? "Szkice" : "Produkty"}
        </Title>
        {total !== undefined && (
          <Text c="dimmed" fz="lg">
            {isDraft ? `${count(total, ["płyta", "płyty", "płyt"])} do dokończenia` : `${count(total, ["płyta", "płyty", "płyt"])} w sprzedaży`}
          </Text>
        )}
      </Group>

      <TextInput
        size="lg"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="Szukaj płyty"
        leftSection={<IconSearch size={22} />}
        aria-label="Szukaj: artysta, tytuł, numer katalogowy"
      />

      {products.isPending && <Skeleton h={300} />}
      {products.isError && <Text c="red">{products.error.message}</Text>}
      {total === 0 && (
        <Text fz="lg" ta="center" py="xl">
          {q ? `Nic nie pasuje do „${q}”.` : isDraft ? "Wszystkie płyty są dokończone." : "Nie ma jeszcze płyt w sprzedaży."}
        </Text>
      )}

      <RecordRows
        products={items}
        renderRow={(product) => (
          <RecordRow
            product={product}
            href={`${isDraft ? "/szkice" : "/produkty"}#${product.id}`}
            badges={isDraft ? <DraftBadges product={product} /> : undefined}
            right={isDraft ? <IconChevronRight size={28} /> : <Price product={product} />}
          />
        )}
      />

      {products.hasNextPage && (
        <Button variant="light" size="lg" fullWidth loading={products.isFetchingNextPage} onClick={() => products.fetchNextPage()}>
          Pokaż więcej
        </Button>
      )}
    </Stack>
  );
}
