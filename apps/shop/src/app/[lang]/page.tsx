import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Storefront from "../Storefront";
import { isLocale } from "../messages";
import { getCatalog } from "@/services/catalog";

export default async function Page({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const query = await searchParams;
  const savedView = (await cookies()).get("catalog-view")?.value;
  const sort = query.sort ?? "newest";
  if (typeof sort !== "string" || !/^(newest|(artist|title|price)_(asc|desc))$/.test(sort)) notFound();
  const page = Number(query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) notFound();
  let catalog;
  try {
    catalog = await getCatalog(page, sort);
  } catch (error) {
    console.error("Catalogue request failed", error);
  }
  if (catalog && page > Math.max(1, catalog.totalPages)) notFound();
  return (
    <Storefront
      lang={lang}
      releases={catalog?.releases ?? []}
      failed={!catalog}
      savedView={savedView === "list" || savedView === "grid" ? savedView : null}
      sort={sort}
      page={page}
      copies={catalog?.copies ?? 0}
      total={catalog?.total ?? 0}
      pages={catalog?.totalPages ?? 0}
    />
  );
}
