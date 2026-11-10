import { Group, Paper, Stack, Text } from "@mantine/core";
import { IconChevronRight, IconPencil, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import PageTitle from "@/components/ui/PageTitle";

/** Miejsca, które nie mieszczą się w dolnym menu: szkice i ustawienia. */
export default function MorePage() {
  const links = [
    { href: "/szkice", label: "Szkice", hint: "Niedokończone płyty", icon: IconPencil },
    { href: "/ustawienia", label: "Ustawienia", hint: "Konfiguracja panelu", icon: IconSettings },
  ];

  return (
    <Stack gap="md" p="md">
      <PageTitle title="Więcej" />
      <Stack component="ul" gap="sm" p={0} m={0}>
        {links.map(({ href, label, hint, icon: Icon }) => (
          <li key={href} style={{ listStyle: "none" }}>
            <Paper component={Link} href={href} withBorder p="md" radius="md" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
              <Group justify="space-between" wrap="nowrap">
                <Group wrap="nowrap">
                  <Icon size={22} aria-hidden="true" />
                  <Stack gap={0}>
                    <Text fw={600} fz="md">{label}</Text>
                    <Text fz="sm" c="dimmed">{hint}</Text>
                  </Stack>
                </Group>
                <IconChevronRight size={18} aria-hidden="true" />
              </Group>
            </Paper>
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
