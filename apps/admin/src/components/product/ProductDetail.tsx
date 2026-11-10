"use client";

import { Accordion, Anchor, Badge, Group, Stack } from "@mantine/core";
import { IconArrowLeft, IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { cameFrom } from "@/lib/backToList";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useProduct } from "@/hooks/useProduct";
import DeleteProductButton from "./DeleteProductButton";
import PreviewLinksEditor from "./PreviewLinksEditor";
import ProductHeader from "./ProductHeader";
import ProductInfoForm from "./ProductInfoForm";
import UnpublishButton from "./UnpublishButton";
import VariantCard from "./VariantCard";

type ProductDetailProps = {
  productId: number;
  /** Wariant, którego edycja otwiera się od razu (wejście z listy presów). */
  openVariantId?: number;
};

/**
 * Widok produktu: status i publikacja, dane płyty, odsłuch, warianty ze zdjęciami, usuwanie.
 * Tu kończy się szkic dodany w kreatorze.
 */
const ProductDetail = ({ productId, openVariantId }: ProductDetailProps) => {
  const { data, isPending, isError, error } = useProduct(productId);
  const product = data?.product;
  const backHref = product && !product.isPublished ? "/szkice" : "/produkty";
  const router = useRouter();

  // Edycja otwarta z listy presów: po zamknięciu wracamy na listę (w historii, na to samo miejsce).
  // Okno na telefonie (pełny ekran) potrafi zgłosić zamknięcie dwa razy; drugie cofnięcie wyrzucało
  // na wcześniejszą stronę (np. „Dodaj płytę”), więc wracamy tylko raz.
  const returned = useRef(false);
  // Zwraca `true`, gdy wracamy na listę: okno zostaje wtedy otwarte i znika razem ze stroną, bez mignięcia tjuna.
  const closeOpenedVariant = () => {
    if (returned.current) return true;
    if (!cameFrom("/produkty")) {
      router.replace(`/produkty/${productId}`, { scroll: false });
      return false;
    }
    returned.current = true;
    router.back();
    return true;
  };

  return (
    // Ujemny margines znosi górny padding `main`: powrót do listy przylega do nagłówka.
    <Stack
      component="article"
      aria-labelledby="product-title"
      gap="lg"
      maw={640}
      mx={{ base: "auto", sm: 0 }}
      mt="calc(var(--mantine-spacing-md) * -1)"
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        {/* Zwykły link, podkreślony dopiero przy najechaniu (bez tła), z wysokością wygodną do kliknięcia. */}
        <Anchor
          component={Link}
          href={backHref}
          // Z listy wracamy w historii, żeby wrócić do edytowanej płyty, a nie na górę listy.
          onClick={(event: React.MouseEvent) => {
            if (!cameFrom(backHref)) return;
            event.preventDefault();
            router.back();
          }}
          underline="hover"
          fz="lg"
          fw={600}
          py="sm"
          w="fit-content"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <IconArrowLeft size={24} aria-hidden="true" />
          {backHref === "/szkice" ? "Szkice" : "Produkty"}
        </Anchor>
        {product && (
          <Badge color={product.isPublished ? "success" : "warning"} variant="light" size="xl" fz="sm" fw={600}>
            {product.isPublished ? "W sprzedaży" : "Szkic"}
          </Badge>
        )}
      </Group>

      {isPending && <LoadingState label="Ładowanie płyty" height={400} />}
      {isError && <ErrorState message={error.message} />}

      {product && data && (
        <>
          <ProductHeader product={product} warnings={data.warnings} />
          {/* Kilka sekcji może być otwartych naraz; na start tylko warianty, bo tam jest najwięcej pracy. */}
          <Accordion
            multiple
            defaultValue={["variants"]}
            order={2}
            // Własna ikona na całą szerokość pola: domyślna (16 px) po obróceniu przeskakuje w bok.
            chevron={<IconChevronDown size={28} aria-hidden="true" />}
            chevronSize={28}
            // Bez wcięcia z boków: nagłówki i treść sekcji równają się z tytułem płyty.
            styles={{
              label: { fontSize: "var(--mantine-h2-font-size)", fontWeight: 700 },
              control: { paddingInline: 0 },
              content: { paddingInline: 0 },
            }}
          >
            <Accordion.Item value="record">
              <Accordion.Control>Płyta</Accordion.Control>
              <Accordion.Panel>
                {/* key: po zapisie formularz startuje od świeżych danych z API. */}
                <ProductInfoForm key={product.updatedAt} product={product} />
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="preview">
              <Accordion.Control>Odsłuch</Accordion.Control>
              <Accordion.Panel>
                <PreviewLinksEditor product={product} />
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="variants">
              <Accordion.Control>{`Warianty (${product.variants.length})`}</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={0}>
                  {product.variants.map((variant, index) => (
                    <VariantCard
                      key={variant.id}
                      productId={product.id}
                      variant={variant}
                      position={index + 1}
                      last={index === product.variants.length - 1}
                      {...(variant.id === openVariantId && { openOnMount: true, onEditClose: closeOpenedVariant })}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="settings">
              <Accordion.Control>Ustawienia</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {product.isPublished && <UnpublishButton product={product} />}
                  <DeleteProductButton product={product} />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </>
      )}
    </Stack>
  );
};

export default ProductDetail;
