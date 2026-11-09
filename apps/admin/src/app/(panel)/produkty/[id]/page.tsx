import { notFound } from "next/navigation";
import ProductDetail from "@/components/product/ProductDetail";

type ProductPageProps = {
  params: Promise<{ id: string }>;
  /** `?pres=<id wariantu>`: z listy presów od razu otwiera edycję tego wariantu. */
  searchParams: Promise<{ pres?: string }>;
};

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const pres = Number((await searchParams).pres);
  return <ProductDetail productId={id} {...(Number.isInteger(pres) && pres > 0 && { openVariantId: pres })} />;
}
