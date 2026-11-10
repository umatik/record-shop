import { notFound } from "next/navigation";
import { isLocale } from "../../messages";
import { RegisterForm } from "@/components/RegisterForm";

export default async function RegisterPage({ params }: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <main className="login-page"><RegisterForm lang={lang} /></main>;
}
