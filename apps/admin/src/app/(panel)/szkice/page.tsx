import ProductsList from "@/components/records/ProductsList";

export default async function DraftsPage({ searchParams }: { searchParams: Promise<{ szukaj?: string }> }) {
  const { szukaj } = await searchParams;
  return <ProductsList status="draft" initialSearch={szukaj ?? ""} />;
}
