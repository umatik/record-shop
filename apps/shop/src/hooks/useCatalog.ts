import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { getCatalog } from "@/services/catalog";
type Batch = Awaited<ReturnType<typeof getCatalog>>;
export function useCatalog(page: number, initial: Batch, enabled: boolean, sort: string) {
  const marker = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["shop-catalog", page, sort],
    enabled,
    initialPageParam: page,
    initialData: { pages: [initial], pageParams: [page] },
    queryFn: async ({ pageParam, signal }): Promise<Batch> => {
      const res = await fetch(`/api/catalog?page=${pageParam}&sort=${encodeURIComponent(sort)}`, { signal });
      if (!res.ok) throw new Error("Catalogue unavailable");
      return res.json();
    },
    getNextPageParam: (last, _pages, current) => (current < last.totalPages ? current + 1 : undefined),
  });
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } = query;
  useEffect(() => {
    const el = marker.current;
    if (!enabled || !el || !hasNextPage || isFetching || isFetchNextPageError || !("IntersectionObserver" in window))
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage({ cancelRefetch: false });
      },
      { rootMargin: "160px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);
  const variants = Array.from(
    new Map(query.data.pages.flatMap((batch) => batch.releases.map((r) => [r.id, r] as const))).values(),
  );
  return {
    variants,
    marker,
    hasNextPage,
    isFetching,
    isFetchNextPageError,
    loadMore: () => fetchNextPage({ cancelRefetch: false }),
  };
}
