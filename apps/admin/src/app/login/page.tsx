import { Center, Paper, Stack, Text, Title } from "@mantine/core";
import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Logo from "@/components/layout/Logo";

export default function LoginPage() {
  return (
    <Center component="main" mih="100dvh" p="md">
      <Paper component="section" aria-labelledby="login-title" w="100%" maw={380} p="lg" withBorder>
        <Stack align="center" gap={4} mb="lg">
          <Logo size={96} />
          <Title id="login-title" order={2}>
            Panel sklepu
          </Title>
          <Text c="dimmed" fz="sm">
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
