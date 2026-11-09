import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getLabelDrafts } from "@/services/labelDrafts.services";
import { getProducts } from "@/services/products.services";
import type { ProductStatus } from "@/types/product";
import { productKeys } from "./queryKeys";

const PAGE_SIZE = 20;

/** Lista płyt jednego statusu z wyszukiwaniem, ładowana stronami („Pokaż więcej”). */
export function useProductList(status: ProductStatus, q: string) {
  const query = useInfiniteQuery({
    queryKey: productKeys.list(status, q),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getProducts({ status, q, page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: ({ pagination }) => (pagination.page < pagination.totalPages ? pagination.page + 1 : undefined),
  });

  return {
    ...query,
    products: query.data?.pages.flatMap((page) => page.products) ?? [],
    total: query.data?.pages[0]?.pagination.total,
  };
}

export function useLabelDraftList(enabled: boolean) {
  return useQuery({ queryKey: [...productKeys.all, "label-drafts"], queryFn: getLabelDrafts, enabled });
}

/** Sama liczba płyt danego statusu (np. licznik szkiców w menu). */
export function useProductCount(status: ProductStatus) {
  const drafts = useLabelDraftList(status === "draft");
  return useQuery({
    queryKey: productKeys.count(status),
    queryFn: () => getProducts({ status, page: 1, limit: 1 }),
    select: (data) => data.pagination.total + (status === "draft" ? (drafts.data?.length ?? 0) : 0),
  });
}
