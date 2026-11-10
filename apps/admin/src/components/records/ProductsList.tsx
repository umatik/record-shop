"use client";

import { Button, CloseButton, Group, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconMusic, IconPackage, IconSearch, IconVinyl, type Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import PageTitle from "@/components/ui/PageTitle";
import { useLabelDraftList, useProductList } from "@/hooks/useProducts";
import { count, formatEur, mediaSrc, primaryPhoto, productArtist, variantPhoto } from "@/lib/format";
import { describeVariant } from "@/lib/vinyl";
import type { Product, ProductStatus, Variant } from "@/types/product";
import { deleteLabelDraft } from "@/services/labelDrafts.services";
import { deleteProduct } from "@/services/products.services";
import DraftActions from "./DraftActions";
import DraftBadges from "./DraftBadges";
import ListRow from "./ListRow";
import RowList from "./RowList";

export type ProductsView = "products" | "variants";

type ProductsListProps = {
  status: ProductStatus;
  /** Opublikowane: wiersz = płyta albo wiersz = wariant (`?widok=warianty`). */
  view?: ProductsView;
  /** Fraza z adresu (`?szukaj=`): po powrocie z produktu lista pokazuje te same wyniki. */
  initialSearch?: string;
  /**
   * Zawężenie z adresu: opublikowane tylko na stanie (`?dostepne=1`), szkice tylko gotowe do publikacji
   * (`?gotowe=1`). Pulpit linkuje do tak zawężonych list, a liczniki w tytule opisują wtedy ten sam zbiór.
   */
  narrowed?: boolean;
};

const VIEWS = [
  { value: "products", label: "Tunes" },
  { value: "variants", label: "Presses" },
];

/** Licznik z ikoną; pełny opis w podpowiedzi i dla czytnika ekranu. */
const Stat = ({ icon: StatIcon, value, label }: { icon: Icon; value: number; label: string }) => (
  <Group component="span" gap={4} wrap="nowrap" title={label} aria-label={label} role="img">
    <StatIcon size={20} aria-hidden="true" />
    <span aria-hidden="true">{value}</span>
  </Group>
);

const COPY: Record<
  ProductStatus,
  {
    title: string;
    counter: (n: number, stock?: { copies?: number; presses?: number }) => ReactNode;
    empty: string;
    /** Zawężenie listy: parametr w adresie, podpis przełącznika i pusty stan po zawężeniu. */
    narrow: { param: string; label: string; empty: string; defaultOn: boolean };
    /** Krótki opis pod przełącznikami: co widać na liście w danym trybie. */
    hint: { all: string; narrow: string };
  }
> = {
  published: {
    title: "Produkty",
    // Sztuki na stanie (fizyczne płyty) i tjuny, w których leżą.
    counter: (n, { copies, presses } = {}) => (
      <Group component="span" gap="md" wrap="nowrap">
        {copies !== undefined && (
          <Stat icon={IconPackage} value={copies} label={`${count(copies, ["płyta", "płyty", "płyt"])} na stanie`} />
        )}
        {presses !== undefined && (
          <Stat icon={IconVinyl} value={presses} label={count(presses, ["pres", "presy", "presów"])} />
        )}
        <Stat icon={IconMusic} value={n} label={count(n, ["tjun", "tjuny", "tjunów"])} />
      </Group>
    ),
    empty: "Nie ma jeszcze płyt w sprzedaży.",
    narrow: {
      param: "dostepne",
      label: "Na stanie",
      empty: "Żadna płyta nie jest teraz na stanie.",
      defaultOn: true,
    },
    hint: {
      all: "Wszystkie płyty, także bez sztuk.",
      narrow: "Tylko płyty, które są na stanie.",
    },
  },
  draft: {
    title: "Szkice",
    counter: (n) => `${count(n, ["płyta", "płyty", "płyt"])} do dokończenia`,
    empty: "Wszystkie płyty są dokończone.",
    narrow: {
      param: "gotowe",
      label: "Gotowe do publikacji",
      empty: "Żaden szkic nie jest jeszcze gotowy.",
      defaultOn: false,
    },
    hint: {
      all: "Płyty rozpoczęte w kreatorze, jeszcze nieopublikowane.",
      narrow: "Tylko szkice gotowe do publikacji.",
    },
  },
};

/** Lista płyt jednego statusu z wyszukiwaniem i przyciskiem „Pokaż więcej”. */
const ProductsList = ({ status, view = "products", initialSearch = "", narrowed = false }: ProductsListProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef<HTMLInputElement>(null);
  const [q] = useDebouncedValue(search.trim(), 300);
  const copy = COPY[status];
  const isDraft = status === "draft";
  const list = useProductList(status, q, narrowed ? (isDraft ? { ready: true } : { available: true }) : {});

  /** Adres listy z widokiem, frazą i zawężeniem; replace, żeby wpisywanie nie zapychało historii. */
  const listHref = (nextView: string, phrase: string, nextNarrowed = narrowed) => {
    const params = new URLSearchParams();
    if (nextView === "variants") params.set("widok", "warianty");
    // Domyślny stan nie trafia do adresu; zmiana na niedomyślny zapisuje się jako 1 albo 0.
    if (nextNarrowed !== copy.narrow.defaultOn) params.set(copy.narrow.param, nextNarrowed ? "1" : "0");
    if (phrase) params.set("szukaj", phrase);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  useEffect(() => {
    if (q !== initialSearch) router.replace(listHref(view, q), { scroll: false });
    // Reagujemy tylko na zmianę frazy; reszta adresu idzie z tego samego renderu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Szkic kreatora nie jest jeszcze płytą, więc nie bywa „gotowy do publikacji”.
  const showLabelDrafts = isDraft && !narrowed;
  const drafts = useLabelDraftList(showLabelDrafts);
  const labelDrafts = (showLabelDrafts ? (drafts.data ?? []) : [])
    .map((draft) => {
      const details = draft.state?.details;
      return {
        ...draft,
        artist: details?.artists ?? "",
        title: details ? details.title || "Płyta bez tytułu" : "Płyta do rozpoznania",
      };
    })
    .filter((draft) => `${draft.artist} ${draft.title}`.toLowerCase().includes(q.toLowerCase()));
  const total =
    list.total === undefined || (showLabelDrafts && !drafts.data) ? undefined : list.total + labelDrafts.length;

  const clearSearch = () => {
    setSearch("");
    searchRef.current?.focus();
  };

  const changeView = (next: string) => router.replace(listHref(next, q), { scroll: false });

  // „Tylko na stanie” zwraca płyty z presem na stanie; wyprzedane presy tych płyt też odpadają.
  const variantRows = list.products
    .flatMap((product) => product.variants.map((variant) => ({ product, variant })))
    .filter(({ variant }) => !narrowed || variant.quantity > 0);

  const renderVariant = ({ product, variant }: { product: Product; variant: Variant }) => (
    <ListRow
      href={`/produkty/${product.id}?pres=${variant.id}`}
      thumb={variantPhoto(variant) ?? primaryPhoto(product)}
      title={productArtist(product) || product.title}
      subtitle={productArtist(product) ? product.title : undefined}
      extra={
        <Text fz="sm" c="dimmed">
          {describeVariant(variant.attributes)}
        </Text>
      }
      aside={
        <Stack gap={2} align="flex-end" style={{ whiteSpace: "nowrap" }}>
          <Text fw={700} fz="md">
            {formatEur(variant.priceEur)}
          </Text>
          <Text fz="sm" fw={600} c={variant.quantity === 0 ? "danger" : undefined}>
            {variant.quantity === 0 ? "wyprzedane" : `${variant.quantity} szt.`}
          </Text>
        </Stack>
      }
    />
  );

  const renderProduct = (product: Product) => (
    <ListRow
      href={`/produkty/${product.id}`}
      thumb={primaryPhoto(product)}
      variants={product.variants.length}
      title={productArtist(product) || product.title}
      subtitle={product.title}
      extra={isDraft ? <DraftBadges product={product} /> : undefined}
      {...(isDraft && {
        actions: (
          <DraftActions
            name={[productArtist(product), product.title].filter(Boolean).join(" – ")}
            editHref={`/produkty/${product.id}`}
            onDelete={() => deleteProduct(product.id)}
          />
        ),
      })}
      aside={
        isDraft ? undefined : (
          <Text fw={700} fz="md" style={{ whiteSpace: "nowrap" }}>
            {product.variants.reduce((sum, variant) => sum + variant.quantity, 0)} szt.
          </Text>
        )
      }
    />
  );

  return (
    <Stack component="section" aria-labelledby="products-title" gap="lg" w="100%">
      <PageTitle
        id="products-title"
        title={copy.title}
        aside={total !== undefined ? copy.counter(total, list) : undefined}
      />

      <TextInput
        ref={searchRef}
        type="search"
        size="lg"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Escape" && search && clearSearch()}
        placeholder="Szukaj płyty"
        leftSection={<IconSearch size={22} aria-hidden="true" />}
        rightSectionWidth={52}
        rightSectionPointerEvents="all"
        rightSection={
          search && <CloseButton size="lg" iconSize={22} onClick={clearSearch} aria-label="Wyczyść wyszukiwanie" />
        }
        aria-label="Szukaj: artysta, tytuł, numer katalogowy"
      />

      <Group justify="space-between" wrap="nowrap" gap="xs">
        {!isDraft && (
          <SegmentedControl
            size="lg"
            radius="md"
            value={view}
            onChange={changeView}
            data={VIEWS}
            aria-label="Widok listy"
            style={{ flex: "0 0 auto" }}
          />
        )}
        <Button
          size="lg"
          radius="md"
          variant="filled"
          bg={narrowed ? "white" : "gray.1"}
          c="dark.8"
          aria-pressed={narrowed}
          onClick={() => router.replace(listHref(view, q, !narrowed), { scroll: false })}
          style={{ flexShrink: 0 }}
          styles={{ label: { whiteSpace: "nowrap" } }}
        >
          {copy.narrow.label}
        </Button>
      </Group>
      <Text fz="sm" c="dimmed" aria-live="polite">
        {narrowed ? copy.hint.narrow : copy.hint.all}
      </Text>

      {list.isPending && <LoadingState label="Ładowanie płyt" height={300} />}
      {list.isError && <ErrorState message={list.error.message} />}
      {total === 0 && (
        <EmptyState title={q ? `Nic nie pasuje do „${q}”.` : narrowed ? copy.narrow.empty : copy.empty} />
      )}

      {showLabelDrafts && drafts.isError && <ErrorState message={drafts.error.message} />}
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
              actions={
                <DraftActions
                  name={[draft.artist, draft.title].filter(Boolean).join(" – ")}
                  editHref={`/dodaj?szkic=${draft.id}`}
                  onDelete={() => deleteLabelDraft(draft.id)}
                />
              }
            />
          )}
        />
      )}
      {view === "variants" && !isDraft ? (
        <RowList items={variantRows} getKey={(row) => row.variant.id} renderItem={renderVariant} label="Presy" />
      ) : (
        <RowList items={list.products} getKey={(product) => product.id} renderItem={renderProduct} label={copy.title} />
      )}

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
