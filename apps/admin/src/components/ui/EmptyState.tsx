import { Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

/** Pusty stan listy: zaproszenie, nie przeprosiny. */
const EmptyState = ({ title, description, icon }: EmptyStateProps) => (
  <Stack role="status" align="center" gap="xs" py="xl">
    {icon}
    <Text fz="xl" fw={700} ta="center">
      {title}
    </Text>
    {description && (
      <Text c="dimmed" fz="lg" ta="center">
        {description}
      </Text>
    )}
  </Stack>
);

export default EmptyState;
