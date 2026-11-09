"use client";

import { Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useDeleteProduct } from "@/hooks/useProduct";
import type { Product } from "@/types/product";

type DeleteProductButtonProps = {
  product: Product;
};

/** Usunięcie produktu z potwierdzeniem; po usunięciu powrót do listy, z której przyszła płyta. */
const DeleteProductButton = ({ product }: DeleteProductButtonProps) => {
  const router = useRouter();
  const [opened, modal] = useDisclosure(false);
  const deleteProduct = useDeleteProduct(product.id);

  return (
    <>
      <Button
        size="lg"
        variant="subtle"
        color="red"
        fullWidth
        leftSection={<IconTrash size={24} aria-hidden="true" />}
        onClick={modal.open}
      >
        Usuń produkt
      </Button>
      <ConfirmModal
        opened={opened}
        title="Usunąć produkt?"
        confirmLabel="Usuń produkt"
        danger
        loading={deleteProduct.isPending}
        error={deleteProduct.error?.message ?? null}
        onConfirm={() =>
          deleteProduct.mutate(undefined, {
            onSuccess: () => router.replace(product.isPublished ? "/produkty" : "/szkice"),
          })
        }
        onClose={modal.close}
      >
        Płyta zniknie ze sklepu i z panelu razem ze wszystkimi wariantami. Zamówienia, w których była, zostaną.
      </ConfirmModal>
    </>
  );
};

export default DeleteProductButton;
