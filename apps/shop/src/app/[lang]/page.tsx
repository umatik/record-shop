import { notFound } from "next/navigation";
import Storefront from "../Storefront";
import { isLocale } from "../messages";
import { getCatalog } from "@/services/catalog";

export default async function Page({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const page = Number((await searchParams).page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) notFound();
  let catalog;
  try {
    catalog = await getCatalog(page);
  } catch (error) {
    console.error("Catalogue request failed", error);
  }
  if (catalog && page > Math.max(1, catalog.totalPages)) notFound();
  return (
    <Storefront
      lang={lang}
      releases={catalog?.releases ?? []}
      failed={!catalog}
      page={page}
      copies={catalog?.copies ?? 0}
      total={catalog?.total ?? 0}
      pages={catalog?.totalPages ?? 0}
    />
  );
}
