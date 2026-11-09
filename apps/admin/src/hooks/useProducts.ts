import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getLabelDrafts } from "@/services/labelDrafts.services";
import { getProducts } from "@/services/products.services";
import type { ProductListScope, ProductStatus } from "@/types/product";
import { productKeys } from "./queryKeys";

const PAGE_SIZE = 20;

/** Lista płyt jednego statusu z wyszukiwaniem, ładowana stronami („Pokaż więcej”). */
export function useProductList(status: ProductStatus, q: string, scope: ProductListScope = {}) {
  const query = useInfiniteQuery({
    queryKey: productKeys.list(status, q, scope),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getProducts({ status, q, page: pageParam, limit: PAGE_SIZE, ...scope }),
    getNextPageParam: ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined),
  });

  return {
    ...query,
    products: query.data?.pages.flatMap((page) => page.products) ?? [],
    total: query.data?.pages[0]?.pagination.total,
    copies: query.data?.pages[0]?.copies,
    presses: query.data?.pages[0]?.presses,
  };
}

export function useLabelDraftList(enabled: boolean) {
  return useQuery({ queryKey: productKeys.labelDrafts(), queryFn: getLabelDrafts, enabled });
}

/** Sama liczba płyt danego statusu (np. licznik szkiców w menu). */
export function useProductCount(status: ProductStatus, enabled = true) {
  const drafts = useLabelDraftList(enabled && status === "draft");
  return useQuery({
    queryKey: productKeys.count(status),
    queryFn: () => getProducts({ status, page: 1, limit: 1 }),
    select: (data) => data.pagination.total + (status === "draft" ? (drafts.data?.length ?? 0) : 0),
    enabled,
  });
}

/** Szkice, którym nic nie brakuje do publikacji. Szkice kreatora nie są jeszcze płytami, więc się nie liczą. */
export function useReadyDraftCount(enabled = true) {
  const scope = { ready: true };
  return useQuery({
    queryKey: productKeys.count("draft", scope),
    queryFn: () => getProducts({ status: "draft", page: 1, limit: 1, ...scope }),
    select: (data) => data.pagination.total,
    enabled,
  });
}

/** Stan magazynu w sklepie: sztuki i presy na stanie w opublikowanych płytach (ten sam zbiór co „Na stanie”). */
export function useStock(enabled = true) {
  const scope = { available: true };
  return useQuery({
    queryKey: productKeys.count("published", scope),
    queryFn: () => getProducts({ status: "published", page: 1, limit: 1, ...scope }),
    select: (data) => ({ copies: data.copies ?? 0, presses: data.presses ?? 0 }),
    enabled,
  });
}
