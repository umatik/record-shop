"use client";

import { ActionIcon, AppShell, Badge, Group, Menu, NavLink, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api, logout } from "@/lib/api";
import type { Me, ProductList } from "@/lib/types";
import { Logo } from "./Logo";
import { isActive, navItems, upcomingItems } from "./nav";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/users/me"), staleTime: Infinity });
}

export function useDraftCount() {
  return useQuery({
    queryKey: ["products", "count", "draft"],
    queryFn: () => api<ProductList>("/products/manage?status=draft&limit=1"),
    select: (data) => data.pagination.total,
  });
}

function UserMenu() {
  const { data: me } = useMe();
  return (
    <Menu position="bottom-end" width={220}>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" size="xl" aria-label="Konto">
          <IconUserCircle size={30} stroke={1.5} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{me?.user.email ?? "…"}</Menu.Label>
        <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
          Wyloguj
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** Dolne menu na telefonie: najważniejsze miejsca pod kciukiem, aparat na środku. */
function BottomNav({ pathname }: { pathname: string }) {
  return (
    <Group h="100%" justify="space-around" wrap="nowrap" px="xs">
      {navItems.map(({ href, label, icon: Icon, ...item }) => {
        const active = isActive(pathname, href);
        if ("primary" in item) {
          return (
            <ActionIcon
              key={href}
              component={Link}
              href={href}
              size={56}
              radius="xl"
              aria-label={label}
              style={{ marginTop: -24 }}
            >
              <Icon size={28} />
            </ActionIcon>
          );
        }
        return (
          <UnstyledButton
            key={href}
            component={Link}
            href={href}
            aria-current={active ? "page" : undefined}
            c={active ? "blue" : "dimmed"}
            fw={active ? 700 : 400}
            style={{ flex: 1, minHeight: 48 }}
          >
            <Stack gap={2} align="center">
              <Icon size={28} />
              <Text fz={15} fw={500} inherit>
                {label}
              </Text>
            </Stack>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  const { data: draftCount } = useDraftCount();
  return (
    <Stack gap={4}>
      {navItems.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          component={Link}
          href={href}
          label={label}
          active={isActive(pathname, href)}
          leftSection={<Icon size={20} />}
          rightSection={
            href === "/szkice" && draftCount ? (
              <Badge size="sm" color="yellow" variant="light">
                {draftCount}
              </Badge>
            ) : null
          }
        />
      ))}
      {upcomingItems.map(({ label, icon: Icon }) => (
        <NavLink
          key={label}
          label={label}
          description="wkrótce"
          disabled
          leftSection={<Icon size={20} />}
        />
      ))}
    </Stack>
  );
}

export function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 48em)");

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: true } }}
      footer={{ height: 72, collapsed: isDesktop === true }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Group gap="xs">
            <Logo size={36} />
            <Text fw={800} fz="lg" lts={1}>
              RASBASS
            </Text>
            </Group>
          </Link>
          <UserMenu />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <SideNav pathname={pathname} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer hiddenFrom="sm">
        <BottomNav pathname={pathname} />
      </AppShell.Footer>
    </AppShell>
  );
}
