import { notFound } from "next/navigation";
import ProductDetail from "@/components/product/ProductDetail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <ProductDetail productId={id} />;
}
