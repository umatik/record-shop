import { IconCamera, IconDisc, IconHome, IconPencil, IconSettings, type Icon } from "@tabler/icons-react";

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  /** Główna akcja: duży przycisk aparatu na środku dolnego menu. */
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Pulpit", icon: IconHome },
  { href: "/produkty", label: "Produkty", icon: IconDisc },
  { href: "/dodaj", label: "Dodaj płytę", icon: IconCamera, primary: true },
  { href: "/szkice", label: "Szkice", icon: IconPencil },
  { href: "/ustawienia", label: "Ustawienia", icon: IconSettings },
];

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" || pathname.startsWith("/zamowienia") : pathname.startsWith(href);
