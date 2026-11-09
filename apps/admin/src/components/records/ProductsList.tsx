"use client";

import { Button, Stack, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import PageTitle from "@/components/ui/PageTitle";
import { useLabelDraftList, useProductList } from "@/hooks/useProducts";
import { count, mediaSrc, lowestPrice, primaryPhoto, productArtist } from "@/lib/format";
import type { Product, ProductStatus } from "@/types/product";
import DraftBadges from "./DraftBadges";
import ListRow from "./ListRow";
import Price from "./Price";
import RowList from "./RowList";

type ProductsListProps = {
  status: ProductStatus;
};

const COPY: Record<ProductStatus, { title: string; counter: (n: number) => string; empty: string }> = {
  published: {
    title: "Produkty",
    counter: (n) => `${count(n, ["płyta", "płyty", "płyt"])} w sprzedaży`,
    empty: "Nie ma jeszcze płyt w sprzedaży.",
  },
  draft: {
    title: "Szkice",
    counter: (n) => `${count(n, ["płyta", "płyty", "płyt"])} do dokończenia`,
    empty: "Wszystkie płyty są dokończone.",
  },
};

/** Lista płyt jednego statusu z wyszukiwaniem i przyciskiem „Pokaż więcej”. */
const ProductsList = ({ status }: ProductsListProps) => {
  const [search, setSearch] = useState("");
  const [q] = useDebouncedValue(search.trim(), 300);
  const list = useProductList(status, q);
  const copy = COPY[status];
  const isDraft = status === "draft";

  const drafts = useLabelDraftList(isDraft);
  const labelDrafts = (isDraft ? (drafts.data ?? []) : [])
    .map((draft) => {
      const reading = draft.result?.reading;
      return { ...draft, artist: reading?.artists.join(", ") ?? "", title: reading?.title || "Płyta do rozpoznania" };
    })
    .filter((draft) => `${draft.artist} ${draft.title}`.toLowerCase().includes(q.toLowerCase()));
  const total = list.total === undefined || (isDraft && !drafts.data) ? undefined : list.total + labelDrafts.length;

  const renderProduct = (product: Product) => (
    <ListRow
      href={`/produkty/${product.id}`}
      thumb={primaryPhoto(product)}
      title={productArtist(product) || product.title}
      subtitle={product.title}
      extra={isDraft ? <DraftBadges product={product} /> : undefined}
      aside={isDraft ? <IconChevronRight size={28} aria-hidden="true" /> : <Price cents={lowestPrice(product)} />}
    />
  );

  return (
    <Stack component="section" aria-labelledby="products-title" gap="lg" maw={640} mx="auto">
      <PageTitle id="products-title" title={copy.title} aside={total !== undefined ? copy.counter(total) : undefined} />

      <TextInput
        type="search"
        size="lg"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="Szukaj płyty"
        leftSection={<IconSearch size={22} aria-hidden="true" />}
        aria-label="Szukaj: artysta, tytuł, numer katalogowy"
      />

      {list.isPending && <LoadingState label="Ładowanie płyt" height={300} />}
      {list.isError && <ErrorState message={list.error.message} />}
      {total === 0 && <EmptyState title={q ? `Nic nie pasuje do „${q}”.` : copy.empty} />}

      {isDraft && drafts.isError && <ErrorState message={drafts.error.message} />}
      {labelDrafts.length > 0 && (
        <RowList
          items={labelDrafts}
          getKey={(draft) => draft.id}
          label="Rozpoczęte w kreatorze"
          renderItem={(draft) => (
            <ListRow
              href={`/dodaj?szkic=${draft.id}`}
              title={draft.artist || draft.title}
              subtitle={draft.artist ? draft.title : "Dokończ w kreatorze"}
              thumb={draft.photos[0] ? mediaSrc(draft.photos[0].path) : null}
            />
          )}
        />
      )}
      <RowList items={list.products} getKey={(product) => product.id} renderItem={renderProduct} label={copy.title} />

      {list.hasNextPage && (
        <Button
          variant="light"
          size="lg"
          fullWidth
          loading={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
        >
          Pokaż więcej
        </Button>
      )}
    </Stack>
  );
};

export default ProductsList;
