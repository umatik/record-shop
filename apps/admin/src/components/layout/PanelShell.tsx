"use client";

import { AppShell, Group, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { trackPath } from "@/lib/backToList";
import BottomNav from "./BottomNav";
import Logo from "./Logo";
import SideNav from "./SideNav";
import UserMenu from "./UserMenu";

type PanelShellProps = {
  children: ReactNode;
};

/**
 * Szkielet panelu, mobile first: na telefonie nagłówek i dolne menu, od tabletu menu boczne.
 * `AppShell` daje landmarki `header`, `nav`, `main` i `footer`.
 */
const PanelShell = ({ children }: PanelShellProps) => {
  const pathname = usePathname();
  useEffect(() => trackPath(pathname), [pathname]);
  const isDesktop = useMediaQuery("(min-width: 48em)");

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: true } }}
      footer={{ height: 72, collapsed: isDesktop === true }}
      padding="md"
    >
      <AppShell.Header className="camo" withBorder={false}>
        <Group h="100%" px="md" justify="space-between">
          <Link href="/" aria-label="RasBass, pulpit" style={{ textDecoration: "none", color: "inherit" }}>
            <Group gap="xs">
              <Logo size={36} onDark />
              <Text fw={800} fz="lg" lts={1} c="white" aria-hidden="true">
                RASBASS
              </Text>
            </Group>
          </Link>
          <UserMenu />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" aria-label="Menu boczne">
        <SideNav pathname={pathname} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer hiddenFrom="sm" component="nav" aria-label="Menu dolne">
        <BottomNav pathname={pathname} />
      </AppShell.Footer>
    </AppShell>
  );
};

export default PanelShell;
