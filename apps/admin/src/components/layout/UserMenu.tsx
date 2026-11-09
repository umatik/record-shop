"use client";

import { ActionIcon, Menu } from "@mantine/core";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { logout } from "@/services/session.services";

/** Menu konta w nagłówku: kto jest zalogowany i wylogowanie. */
const UserMenu = () => {
  const { data: me } = useCurrentUser();

  return (
    <Menu position="bottom-end" width={240}>
      <Menu.Target>
        <ActionIcon variant="subtle" color="white" size="xl" aria-label="Konto">
          <IconUserCircle size={30} stroke={1.5} aria-hidden="true" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{me?.user.email ?? "…"}</Menu.Label>
        <Menu.Item leftSection={<IconLogout size={16} aria-hidden="true" />} onClick={logout}>
          Wyloguj
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default UserMenu;
