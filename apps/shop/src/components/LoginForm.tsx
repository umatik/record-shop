"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PasswordInput, TextInput } from "@mantine/core";
import { IconAlertCircle, IconBrandApple, IconBrandGoogle, IconX } from "@tabler/icons-react";
import { type Locale } from "@/app/messages";
import { useCheckoutReturn } from "./CartPreview";
import { shippingCopy } from "./ShippingDetails";
import { closeLabel, labels, notices, passwordToggleLabel, resetCopy } from "./auth-copy";
import { useGoBack } from "./useGoBack";

export function LoginForm({ lang, providerError = false }: { lang: Locale; providerError?: boolean }) {
  const finish = useCheckoutReturn();
  const goBack = useGoBack(`/${lang}`);
  const t = shippingCopy[lang];
  const l = labels[lang];
  const [error, setError] = useState(providerError ? notices[lang][2] : "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const completed = query.get("complete");
    let active = true;
    if (completed === "apple" || completed === "google") {
      fetch("/api/account/session")
        .then((r) => r.json())
        .then((session) => {
          if (active && session.email) finish(completed === "apple" ? "Apple ID" : "Google");
        })
        .catch(() => setError(notices[lang][2]));
    }
    return () => {
      active = false;
    };
  }, [lang, finish]);
  return (
    <section aria-labelledby="login-title">
      <button className="auth-close" type="button" aria-label={closeLabel[lang]} onClick={goBack}>
        <IconX size={20} aria-hidden />
      </button>
      <Link href={`/${lang}`} className="login-logo">
        <Image src="/logo.png" width={96} height={96} alt="RasBass Record Shop" />
      </Link>
      <h1 id="login-title">{t.login}</h1>
      {error && <p role="alert" className="auth-alert"><IconAlertCircle size={18} aria-hidden />{error}</p>}
      {error && <Link className="auth-link" href={`/${lang}/forgot-password`}>{resetCopy[lang].forgotLink}</Link>}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const fields = new FormData(event.currentTarget);
          setError("");
          setBusy(true);
          try {
            const result = await fetch("/api/account/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: fields.get("email"), password: fields.get("password"), locale: lang }),
            });
            if (!result.ok) {
              setError(notices[lang][result.status === 400 || result.status === 401 ? 0 : 5]);
              return;
            }
            finish("E-mail");
          } catch {
            setError(notices[lang][5]);
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextInput label={l.username} type="email" name="email" autoComplete="username" required withAsterisk={false} />
        <PasswordInput
          label={l.password}
          name="password"
          autoComplete="current-password"
          required
          withAsterisk={false}
          visibilityToggleButtonProps={{ "aria-label": passwordToggleLabel[lang] }}
        />
        <button className="login-submit" disabled={busy} type="submit">
          {t.login}
        </button>
      </form>
      <Link className="secondary-action" href={`/${lang}/register`}>
        {t.register}
      </Link>
      <p className="login-or">{l.or}</p>
      {(["Google", "Apple ID"] as const).map((provider) => (
        <form key={provider} method="get" action={"/api/account/" + (provider === "Google" ? "google" : "apple")}>
          <input type="hidden" name="lang" value={lang} />
          <button className="account-provider" type="submit" value={provider}>
            {provider === "Google" ? (
              <IconBrandGoogle size={20} aria-hidden />
            ) : (
              <IconBrandApple size={20} aria-hidden />
            )}
            {t.continueWith} {provider}
          </button>
        </form>
      ))}
      <button className="secondary-action login-back" onClick={() => finish()}>
        ← {l.back}
      </button>
    </section>
  );
}
