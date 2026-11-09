import { notFound } from "next/navigation";
import { isLocale } from "@/app/messages";
import LegacyVariantLink from "./LegacyVariantLink";
export default async function Page({ params }: PageProps<"/[lang]/products/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !/^\d+$/.test(id)) notFound();
  return <LegacyVariantLink lang={lang} id={id} />;
}
