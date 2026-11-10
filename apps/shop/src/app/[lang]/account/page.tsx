import { notFound } from "next/navigation";
import { isLocale } from "../../messages";
import { AccountDetails } from "@/components/AccountDetails";

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <main className="login-page"><AccountDetails lang={lang} /></main>;
}
