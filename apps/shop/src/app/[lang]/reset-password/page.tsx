import { notFound } from "next/navigation";
import { isLocale } from "../../messages";
import { ResetPasswordForm } from "@/components/PasswordReset";

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ token?: string | string[] }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { token } = await searchParams;
  return <main className="login-page"><ResetPasswordForm lang={lang} token={typeof token === "string" ? token : null} /></main>;
}
