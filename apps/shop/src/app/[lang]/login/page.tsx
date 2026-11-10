import { notFound } from "next/navigation";
import { isLocale } from "../../messages";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const query = await searchParams;
  return <main className="login-page"><LoginForm lang={lang} providerError={query.error === "provider"} /></main>;
}
