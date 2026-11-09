"use client";

import { Button, Divider, Stack, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useProduct } from "@/hooks/useProduct";
import DeleteProductButton from "./DeleteProductButton";
import PreviewLinksEditor from "./PreviewLinksEditor";
import ProductHeader from "./ProductHeader";
import ProductInfoForm from "./ProductInfoForm";
import VariantCard from "./VariantCard";

type ProductDetailProps = {
  productId: number;
};

/**
 * Widok produktu: status i publikacja, dane płyty, odsłuch, warianty ze zdjęciami, usuwanie.
 * Tu kończy się szkic dodany w kreatorze.
 */
const ProductDetail = ({ productId }: ProductDetailProps) => {
  const { data, isPending, isError, error } = useProduct(productId);
  const product = data?.product;
  const backHref = product && !product.isPublished ? "/szkice" : "/produkty";

  return (
    <Stack component="article" aria-labelledby="product-title" gap="lg" maw={640} mx="auto">
      <Button
        component={Link}
        href={backHref}
        variant="subtle"
        size="lg"
        px={0}
        w="fit-content"
        leftSection={<IconArrowLeft size={24} aria-hidden="true" />}
      >
        {backHref === "/szkice" ? "Szkice" : "Produkty"}
      </Button>

      {isPending && <LoadingState label="Ładowanie płyty" height={400} />}
      {isError && <ErrorState message={error.message} />}

      {product && data && (
        <>
          <ProductHeader product={product} warnings={data.warnings} />
          <Divider />
          {/* key: po zapisie formularz startuje od świeżych danych z API. */}
          <ProductInfoForm key={product.updatedAt} product={product} />
          <Divider />
          <PreviewLinksEditor product={product} />
          <Divider />
          <Stack component="section" aria-labelledby="variants-title" gap="md">
            <Title id="variants-title" order={2}>
              Warianty
            </Title>
            {product.variants.map((variant, index) => (
              <VariantCard key={variant.id} productId={product.id} variant={variant} position={index + 1} />
            ))}
          </Stack>
          <Divider />
          <DeleteProductButton product={product} />
        </>
      )}
    </Stack>
  );
};

export default ProductDetail;
