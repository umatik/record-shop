import { ActionIcon, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import Link from "next/link";
import { isActive, NAV_ITEMS } from "./navItems";

type BottomNavProps = {
  pathname: string;
};

/** Dolne menu na telefonie: najważniejsze miejsca pod kciukiem, aparat na środku. */
const BottomNav = ({ pathname }: BottomNavProps) => (
  <Group component="ul" className="plain-list" h="100%" justify="space-around" wrap="nowrap" px="xs">
    {NAV_ITEMS.map(({ href, label, icon: Icon, primary }) => {
      const active = isActive(pathname, href);
      return (
        <li key={href} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {primary ? (
            <ActionIcon
              component={Link}
              href={href}
              size={56}
              radius="xl"
              aria-label={label}
              style={{ marginTop: -24 }}
            >
              <Icon size={28} aria-hidden="true" />
            </ActionIcon>
          ) : (
            <UnstyledButton
              component={Link}
              href={href}
              aria-current={active ? "page" : undefined}
              c={active ? "camoOlive" : "dimmed"}
              w="100%"
              mih={48}
            >
              <Stack gap={2} align="center">
                <Icon size={28} aria-hidden="true" />
                <Text fz="xs" fw={active ? 700 : 500} inherit>
                  {label}
                </Text>
              </Stack>
            </UnstyledButton>
          )}
        </li>
      );
    })}
  </Group>
);

export default BottomNav;
