import { notFound } from "next/navigation";
import { isLocale } from "../../messages";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ params }: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <main className="login-page"><LoginForm register lang={lang} /></main>;
}
