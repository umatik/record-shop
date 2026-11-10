import { notFound } from "next/navigation";
import { isLocale } from "../../messages";
import { ForgotPasswordForm } from "@/components/PasswordReset";

export default async function ForgotPasswordPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <main className="login-page"><ForgotPasswordForm lang={lang} /></main>;
}
