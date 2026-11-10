"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PasswordInput, TextInput } from "@mantine/core";
import { IconBrandApple, IconBrandGoogle } from "@tabler/icons-react";
import { type Locale } from "@/app/messages";
import { useCheckoutReturn } from "./CartPreview";
import { shippingCopy } from "./ShippingDetails";

const labels = {
  pl: { username: "Login (e-mail)", password: "Hasło", or: "lub", back: "Wróć" },
  en: { username: "Login (email)", password: "Password", or: "or", back: "Back" },
  es: { username: "Usuario (correo electrónico)", password: "Contraseña", or: "o", back: "Volver" },
};
const notices = {
  pl: [
    "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.",
    "Nie udało się utworzyć konta. Użyj innego adresu lub zaloguj się.",
    "Logowanie przez dostawcę jest niedostępne.",
    "Ten adres ma już konto. Zaloguj się.",
    "Podaj poprawny adres e-mail i hasło o długości od 8 do 72 znaków.",
    "Usługa jest chwilowo niedostępna. Spróbuj ponownie za chwilę.",
  ],
  en: [
    "Sign-in failed. Check your details and try again.",
    "Could not create this account. Try another address or sign in.",
    "Provider sign-in is unavailable.",
    "This address already has an account. Sign in instead.",
    "Enter a valid email address and a password of 8 to 72 characters.",
    "The service is temporarily unavailable. Try again in a moment.",
  ],
  es: [
    "No se pudo iniciar sesión. Comprueba tus datos.",
    "No se pudo crear la cuenta. Prueba con otro correo o inicia sesión.",
    "El acceso con este proveedor no está disponible.",
    "Esta dirección ya tiene una cuenta. Inicia sesión.",
    "Introduce un correo válido y una contraseña de 8 a 72 caracteres.",
    "El servicio no está disponible en este momento. Inténtalo de nuevo.",
  ],
} as const;
export function LoginForm({
  lang,
  register = false,
  providerError = false,
}: {
  lang: Locale;
  register?: boolean;
  providerError?: boolean;
}) {
  const finish = useCheckoutReturn();
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
  const title = register ? t.register : t.login;
  return (
    <section aria-labelledby="login-title">
      <Link href={`/${lang}`} className="login-logo">
        <Image src="/logo.png" width={96} height={96} alt="RasBass Record Shop" />
      </Link>
      <h1 id="login-title">{title}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const fields = new FormData(event.currentTarget);
          setError("");
          setBusy(true);
          try {
            const result = await fetch("/api/account/" + (register ? "register" : "login"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: fields.get("email"), password: fields.get("password"), locale: lang }),
            });
            if (!result.ok) {
              const known: Record<number, 0 | 3 | 4 | undefined> = register ? { 409: 3, 400: 4 } : { 400: 0, 401: 0 };
              setError(notices[lang][known[result.status] ?? 5]);
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
          minLength={register ? 8 : undefined}
          autoComplete={register ? "new-password" : "current-password"}
          required
          withAsterisk={false}
          visibilityToggleButtonProps={{
            "aria-label": {
              pl: "Pokaż lub ukryj hasło",
              en: "Show or hide password",
              es: "Mostrar u ocultar contraseña",
            }[lang],
          }}
        />
        {error && <p role="alert">{error}</p>}
        <button className="login-submit" disabled={busy} type="submit">
          {title}
        </button>
      </form>
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
      <Link className="secondary-action" href={`/${lang}/${register ? "login" : "register"}`}>
        {register ? t.login : t.register}
      </Link>
      <button className="secondary-action" onClick={() => finish()}>
        ← {l.back}
      </button>
    </section>
  );
}
