import { Stack, Text, Title } from "@mantine/core";

type ComingSoonProps = {
  title: string;
};

/** Ekran, który powstanie w kolejnym etapie. */
const ComingSoon = ({ title }: ComingSoonProps) => (
  <Stack component="section" aria-labelledby="coming-soon-title" gap="xs" maw={640} mx={{ base: "auto", sm: 0 }}>
    <Title id="coming-soon-title" order={1}>
      {title}
    </Title>
    <Text c="dimmed">Ten ekran powstanie w kolejnym etapie.</Text>
  </Stack>
);

export default ComingSoon;
