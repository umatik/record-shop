import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct, createVariant, publishProduct, uploadVariantPhoto } from "@/services/products.services";
import type { CreateProductInput, PublishWarning } from "@/types/product";
import { productKeys } from "./queryKeys";

type CreateRecordInput = {
  target: { productId: number; isPublished: boolean } | null;
  product: CreateProductInput;
  /** Zdjęcia poza labelem; trafiają za zdjęciami z `photoUploadIds`. */
  extraPhotos: File[];
  publish: boolean;
};

export type CreateRecordResult = {
  productId: number;
  addedVariant: boolean;
  published: boolean;
  warnings: PublishWarning[];
  failedPhotos: number;
};

/** Zapis płyty z kreatora: produkt z wariantem, dodatkowe zdjęcia, opcjonalnie publikacja. */
export function useCreateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product: input,
      extraPhotos,
      publish,
      target,
    }: CreateRecordInput): Promise<CreateRecordResult> => {
      const variantInput = input.variants[0];
      if (!variantInput) throw new Error("Brak danych wariantu.");
      let productId: number;
      let variantId: number | undefined;
      if (target) {
        productId = target.productId;
        variantId = (await createVariant(productId, variantInput)).id;
      } else {
        const product = await createProduct(input);
        productId = product.id;
        variantId = product.variants[0]?.id;
      }
      const labelPhotoCount = variantInput.photoUploadIds?.length ?? 0;

      let failedPhotos = 0;
      if (variantId !== undefined) {
        for (const [index, file] of extraPhotos.entries()) {
          await uploadVariantPhoto(variantId, file, labelPhotoCount + index + 1).catch(() => failedPhotos++);
        }
      }

      const warnings = !target && publish ? await publishProduct(productId) : [];
      return {
        productId,
        addedVariant: Boolean(target),
        published: target?.isPublished ?? publish,
        warnings,
        failedPhotos,
      };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}
