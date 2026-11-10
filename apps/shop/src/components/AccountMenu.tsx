"use client";
import Link from "next/link";
import { Menu } from "@mantine/core";
import { IconLogout, IconUser } from "@tabler/icons-react";
import type { Locale } from "@/app/messages";
import { accountMenuCopy } from "./auth-copy";

export function AccountMenu({ lang, email, signOut }: { lang: Locale; email: string; signOut: () => void }) {
  const c = accountMenuCopy[lang];
  return (
    <Menu position="bottom-end" withinPortal shadow="md" width={220} classNames={{ item: "account-menu-item", label: "account-menu-label" }}>
      <Menu.Target>
        <button className="header-account" type="button" aria-label={`${c.myData} (${email})`} title={email}>
          <IconUser size={20} aria-hidden />
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{email}</Menu.Label>
        <Menu.Item component={Link} href={`/${lang}/account`} leftSection={<IconUser size={16} aria-hidden />}>{c.myData}</Menu.Item>
        <Menu.Item color="red" leftSection={<IconLogout size={16} aria-hidden />} onClick={signOut}>{c.signOut}</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
