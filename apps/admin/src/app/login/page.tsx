"use client";

import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const expired = useSearchParams().get("expired") === "1";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });

    if (response.ok) {
      router.replace("/");
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setError(body.message ?? "Nie udało się zalogować.");
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit}>
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
        <TextInput name="email" type="email" label="E-mail" autoComplete="username" required />
        <PasswordInput name="password" label="Hasło" autoComplete="current-password" required />
        <Button type="submit" loading={loading} fullWidth>
          Zaloguj
        </Button>
      </Stack>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Center mih="100dvh" p="md">
      <Paper w="100%" maw={380} p="lg" withBorder>
        <Stack align="center" gap={4} mb="lg">
          <Logo size={96} />
          <Title order={2} size="h3">
            Panel sklepu
          </Title>
          <Text c="dimmed" size="sm">
            Zaloguj się kontem z dostępem do produktów
          </Text>
        </Stack>
        <Suspense>
          <LoginForm />
        </Suspense>
      </Paper>
    </Center>
  );
}
