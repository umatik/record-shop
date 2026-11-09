import ProductsList from "@/components/records/ProductsList";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ widok?: string; szukaj?: string }>;
}) {
  const { widok, szukaj } = await searchParams;
  return (
    <ProductsList
      status="published"
      view={widok === "warianty" ? "variants" : "products"}
      initialSearch={szukaj ?? ""}
    />
  );
}
