"use client";

import { Alert, Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/services/session.services";

/** Formularz logowania; po wygaśnięciu sesji pokazuje informację, dlaczego trzeba się zalogować ponownie. */
const LoginForm = () => {
  const router = useRouter();
  const expired = useSearchParams().get("expired") === "1";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);

    const failure = await login(String(form.get("email")), String(form.get("password")));
    if (failure === null) {
      router.replace("/");
      return;
    }
    setError(failure);
    setLoading(false);
  }

  // Chrome na iOS dopisuje formularzowi i polom atrybut __gchrome_uniqueid przed hydracją, co Next zgłasza jako błąd.
  return (
    <form onSubmit={onSubmit} aria-label="Logowanie" suppressHydrationWarning>
      <Stack>
        {expired && !error && (
          <Alert color="yellow" variant="light">
            Sesja wygasła. Zaloguj się ponownie.
          </Alert>
        )}
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
        <TextInput
          name="email"
          type="email"
          label="E-mail"
          autoComplete="username"
          required
          withAsterisk={false}
          suppressHydrationWarning
        />
        <PasswordInput
          name="password"
          label="Hasło"
          autoComplete="current-password"
          required
          withAsterisk={false}
          suppressHydrationWarning
        />
        <Button type="submit" loading={loading} fullWidth>
          Zaloguj
        </Button>
      </Stack>
    </form>
  );
};

export default LoginForm;
