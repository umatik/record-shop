import { Stack, Text, Title } from "@mantine/core";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Stack gap="xs" maw={640} mx="auto">
      <Title order={1} size="h2">
        {title}
      </Title>
      <Text c="dimmed">Ten ekran powstanie w kolejnym etapie prototypu.</Text>
    </Stack>
  );
}
