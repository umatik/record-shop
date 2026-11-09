import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct, publishProduct, uploadVariantPhoto } from "@/services/products.services";
import type { CreateProductInput, Product, PublishWarning } from "@/types/product";
import { productKeys } from "./queryKeys";

type CreateRecordInput = {
  product: CreateProductInput;
  /** Zdjęcia poza labelem; trafiają za zdjęciami z `photoUploadIds`. */
  extraPhotos: File[];
  publish: boolean;
};

export type CreateRecordResult = {
  product: Product;
  published: boolean;
  warnings: PublishWarning[];
  failedPhotos: number;
};

/** Zapis płyty z kreatora: produkt z wariantem, dodatkowe zdjęcia, opcjonalnie publikacja. */
export function useCreateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product: input, extraPhotos, publish }: CreateRecordInput): Promise<CreateRecordResult> => {
      const product = await createProduct(input);
      const variantId = product.variants[0]?.id;
      const labelPhotoCount = input.variants[0]?.photoUploadIds?.length ?? 0;

      let failedPhotos = 0;
      if (variantId !== undefined) {
        for (const [index, file] of extraPhotos.entries()) {
          await uploadVariantPhoto(variantId, file, labelPhotoCount + index + 1).catch(() => failedPhotos++);
        }
      }

      const warnings = publish ? await publishProduct(product.id) : [];
      return { product, published: publish, warnings, failedPhotos };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}
