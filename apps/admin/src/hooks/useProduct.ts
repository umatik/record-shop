import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDiscogsCover,
  deleteMedia,
  deleteProduct,
  deleteVariant,
  getProduct,
  publishProduct,
  unpublishProduct,
  updateProduct,
  updateVariant,
  uploadVariantAudio,
  uploadVariantPhoto,
  replaceProductPhoto,
  setPrimaryMedia,
} from "@/services/products.services";
import type { UpdateProductInput, UpdateVariantInput } from "@/types/product";
import { productKeys } from "./queryKeys";

/** Produkt w panelu (także szkic) z ostrzeżeniami. */
export function useProduct(productId: number) {
  return useQuery({ queryKey: productKeys.detail(productId), queryFn: () => getProduct(productId) });
}

/**
 * Każda zmiana produktu odświeża wszystkie zapytania o produkty: szczegóły, listy i liczniki
 * (np. publikacja przenosi płytę ze Szkiców do Produktów).
 */
function useProductMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useReplaceProductPhoto(productId: number) {
  return useProductMutation((file: File) => replaceProductPhoto(productId, file));
}

export function useUpdateProduct(productId: number) {
  return useProductMutation((input: UpdateProductInput) => updateProduct(productId, input));
}

/** Publikacja albo wycofanie ze sprzedaży; publikacja zwraca ostrzeżenia, które nie blokują. */
export function useSetPublished(productId: number) {
  return useProductMutation(async (publish: boolean) =>
    publish ? publishProduct(productId) : unpublishProduct(productId).then(() => []),
  );
}

export function useDeleteProduct(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProduct(productId),
    // Szczegółów usuniętego produktu nie odświeżamy (404), tylko listy.
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: productKeys.detail(productId) });
      return queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateVariant(productId: number) {
  return useProductMutation(({ variantId, input }: { variantId: number; input: UpdateVariantInput }) =>
    updateVariant(productId, variantId, input),
  );
}

export function useDeleteVariant(productId: number) {
  return useProductMutation((variantId: number) => deleteVariant(productId, variantId));
}

export function useAddVariantPhotos() {
  return useProductMutation(
    async ({ variantId, files, after }: { variantId: number; files: File[]; after: number }) => {
      for (const [index, file] of files.entries()) {
        await uploadVariantPhoto(variantId, file, after + index + 1);
      }
    },
  );
}

export function useAddVariantAudio() {
  return useProductMutation(
    ({ variantId, file, alt }: { variantId: number; file: File; alt: string | null }) =>
      uploadVariantAudio(variantId, file, alt),
  );
}

export function useAddDiscogsCover(productId: number) {
  return useProductMutation((variantId: number) => addDiscogsCover(productId, variantId));
}

export function useSetPrimaryMedia() {
  return useProductMutation(setPrimaryMedia);
}

export function useDeleteMedia() {
  return useProductMutation(deleteMedia);
}
