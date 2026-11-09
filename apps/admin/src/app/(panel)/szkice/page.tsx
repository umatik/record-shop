import ProductsList from "@/components/records/ProductsList";

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ szukaj?: string; gotowe?: string }>;
}) {
  const { szukaj, gotowe } = await searchParams;
  return <ProductsList status="draft" initialSearch={szukaj ?? ""} narrowed={gotowe === "1"} />;
}
