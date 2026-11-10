"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PasswordInput, TextInput } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Locale } from "@/app/messages";
import { confirmPasswordCopy, labels, passwordToggleLabel, resetCopy, validation } from "./auth-copy";

function Logo({ lang }: { lang: Locale }) {
  return (
    <Link href={`/${lang}`} className="login-logo">
      <Image src="/logo.png" width={96} height={96} alt="RasBass Record Shop" />
    </Link>
  );
}

function Alert({ message }: { message: string }) {
  return <p role="alert" className="auth-alert"><IconAlertCircle size={18} aria-hidden />{message}</p>;
}

export function ForgotPasswordForm({ lang }: { lang: Locale }) {
  const c = resetCopy[lang];
  const v = validation[lang];
  const l = labels[lang];
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const schema = useMemo(() => z.object({ email: z.email(v.email) }), [v]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: { email: string }) {
    setServerError("");
    try {
      const result = await fetch("/api/account/password-reset-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale: lang }),
      });
      if (!result.ok) {
        setServerError(c.error);
        return;
      }
      setSent(true);
    } catch {
      setServerError(c.error);
    }
  }

  return (
    <section aria-labelledby="login-title">
      <Logo lang={lang} />
      <h1 id="login-title">{c.forgotTitle}</h1>
      {sent ? (
        <p>{c.sent}</p>
      ) : (
        <>
          <p>{c.forgotText}</p>
          {serverError && <Alert message={serverError} />}
          <form noValidate onSubmit={handleSubmit(onSubmit)}>
            <TextInput label={l.username} type="email" autoComplete="username" withAsterisk={false}
                       error={errors.email?.message} {...register("email")} />
            <button className="login-submit" disabled={isSubmitting} type="submit">{c.send}</button>
          </form>
        </>
      )}
      <Link className="secondary-action" href={`/${lang}/login`}>{c.back}</Link>
    </section>
  );
}

export function ResetPasswordForm({ lang, token }: { lang: Locale; token: string | null }) {
  const c = resetCopy[lang];
  const v = validation[lang];
  const [state, setState] = useState<"form" | "done" | "invalid">(token ? "form" : "invalid");
  const [serverError, setServerError] = useState("");
  const schema = useMemo(() => z.object({
    password: z.string().min(8, v.password).max(72, v.password),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: confirmPasswordCopy[lang].mismatch,
  }), [v, lang]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit({ password }: { password: string }) {
    setServerError("");
    try {
      const result = await fetch("/api/account/password-reset-confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (result.status === 204) setState("done");
      else if (result.status === 400) setState("invalid");
      else setServerError(c.error);
    } catch {
      setServerError(c.error);
    }
  }

  return (
    <section aria-labelledby="login-title">
      <Logo lang={lang} />
      <h1 id="login-title">{c.newTitle}</h1>
      {state === "done" && <p>{c.done}</p>}
      {state === "invalid" && <>
        <p>{c.invalid}</p>
        <Link className="login-submit" href={`/${lang}/forgot-password`}>{c.requestNew}</Link>
      </>}
      {state === "form" && <>
        {serverError && <Alert message={serverError} />}
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <PasswordInput label={c.newPassword} autoComplete="new-password" withAsterisk={false}
                         error={errors.password?.message}
                         visibilityToggleButtonProps={{ "aria-label": passwordToggleLabel[lang] }}
                         {...register("password")} />
          <PasswordInput label={confirmPasswordCopy[lang].label} autoComplete="new-password" withAsterisk={false}
                         error={errors.confirmPassword?.message}
                         visibilityToggleButtonProps={{ "aria-label": passwordToggleLabel[lang] }}
                         {...register("confirmPassword")} />
          <button className="login-submit" disabled={isSubmitting} type="submit">{c.save}</button>
        </form>
      </>}
      {state !== "invalid" && <Link className="secondary-action" href={`/${lang}/login`}>{c.back}</Link>}
    </section>
  );
}
