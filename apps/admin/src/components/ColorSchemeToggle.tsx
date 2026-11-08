"use client";

import { Menu, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

/** Pozycja menu konta: przełącza jasny i ciemny motyw. */
export function ColorSchemeMenuItem() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const isDark = computed === "dark";

  return (
    <Menu.Item
      leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
    >
      {isDark ? "Jasny motyw" : "Ciemny motyw"}
    </Menu.Item>
  );
}
